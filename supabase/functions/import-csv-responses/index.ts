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
    
    // Parse CSV manually (simple implementation supporting quoted fields)
    const lines = csv_text.trim().split('\n');
    const headers = parseCSVLine(lines[0]);
    
    console.log('CSV headers:', headers);
    console.log(`Total rows to process: ${lines.length - 1}`);
    
    const responses = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines
      
      const values = parseCSVLine(lines[i]);
      
      if (values.length < headers.length) {
        console.warn(`Row ${i} has fewer columns than headers, skipping`);
        continue;
      }
      
      const row: any = {};
      headers.forEach((header, idx) => {
        row[header.trim()] = values[idx]?.trim() || null;
      });
      
      // Map CSV columns to database columns
      const response = {
        id: row.id,
        project_id: row.project_id,
        question_number: parseInt(row.question_number),
        response_text: row.response_text,
        student_code: row.student_code || null,
        student_id: row.student_id || null, // Empty string -> null
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

// Helper function to parse CSV line with quoted fields support
function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  result.push(current);
  
  return result;
}
