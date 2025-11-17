import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { csv_text } = await req.json();
    
    if (!csv_text) {
      throw new Error('CSV text is required');
    }

    console.log('Parsing CSV data...');
    
    // Parse CSV with proper handling of multiline fields
    const rows = parseCSV(csv_text);
    
    if (rows.length === 0) {
      throw new Error('CSV file is empty');
    }
    
    const headers = rows[0].map(h => h.trim());
    console.log('CSV headers:', headers);
    console.log(`Total rows to process: ${rows.length - 1}`);
    
    const responses = [];
    
    for (let i = 1; i < rows.length; i++) {
      const values = rows[i];
      
      if (!values || values.length === 0) {
        continue; // Skip empty rows
      }
      
      if (values.length < headers.length) {
        console.warn(`Row ${i} has ${values.length} columns but expected ${headers.length}, skipping`);
        continue;
      }
      
      const row: any = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || null;
      });
      
      // Validate required fields
      if (!row.id || !row.project_id || !row.question_number || !row.response_text) {
        console.warn(`Row ${i} missing required fields, skipping`);
        continue;
      }
      
      // Map CSV columns to database columns
      const response = {
        id: row.id.trim(),
        project_id: row.project_id.trim(),
        question_number: parseInt(row.question_number),
        response_text: row.response_text, // Keep multiline text as is
        student_code: row.student_code?.trim() || null,
        student_id: row.student_id?.trim() || null,
        submitted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        elo_score: 1500.0,
        num_comparisons: 0,
        num_wins: 0,
        num_losses: 0,
        num_ties: 0
      };
      
      responses.push(response);
    }
    
    console.log(`Parsed ${responses.length} valid responses`);
    
    if (responses.length === 0) {
      throw new Error('No valid responses found in CSV');
    }
    
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Inserting responses into database...');
    
    // Bulk upsert (insert or update on conflict)
    const { data, error } = await supabase
      .from('student_responses')
      .upsert(responses, { 
        onConflict: 'id',
        ignoreDuplicates: false // Update if exists
      });
    
    if (error) {
      console.error('Database error:', error);
      throw error;
    }
    
    console.log(`Successfully imported ${responses.length} responses`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        imported_count: responses.length,
        message: `Successfully imported ${responses.length} responses`
      }),
      { 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});

// RFC 4180 compliant CSV parser supporting multiline fields
function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote inside quoted field
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // End of row (handle both \n and \r\n)
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip \n in \r\n
      }
      
      // Add field and row if not empty
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      }
    } else {
      // Regular character (including newlines inside quotes)
      currentField += char;
    }
  }
  
  // Add last field and row if exists
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }
  
  return rows;
}
