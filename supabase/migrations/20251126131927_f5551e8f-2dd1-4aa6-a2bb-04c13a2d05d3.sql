-- Fix search_path security issue for webhook function
CREATE OR REPLACE FUNCTION notify_comparison_webhook()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;