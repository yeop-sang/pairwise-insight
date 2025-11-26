-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create webhook notification function
CREATE OR REPLACE FUNCTION notify_comparison_webhook()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://berlpeer.com/api/webhooks/comparisons',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Webhook-Secret', '727334db6d6a1789365f2428d5bcc5493ede98e0174cbff0b6ef31b60d55d791'
    ),
    body := json_build_object(
      'type', 'INSERT',
      'table', 'comparisons',
      'record', row_to_json(NEW)
    )::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS comparison_insert_webhook ON comparisons;
CREATE TRIGGER comparison_insert_webhook
AFTER INSERT ON comparisons
FOR EACH ROW
EXECUTE FUNCTION notify_comparison_webhook();