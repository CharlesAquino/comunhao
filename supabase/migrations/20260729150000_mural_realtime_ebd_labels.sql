-- Corrige o Realtime do mural e normaliza os rótulos dos sete dias da EBD.

ALTER TABLE public.pedidos REPLICA IDENTITY FULL;
ALTER TABLE public.intercessoes REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'pedidos'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'intercessoes'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.intercessoes;
    END IF;
  END IF;
END;
$$;

-- Corrige documentos antigos que ficaram com “Segunda-feira” em todos os dias,
-- preservando títulos, blocos, horários e demais dados editoriais.
WITH normalized_documents AS (
  SELECT
    lesson.id,
    jsonb_agg(
      jsonb_set(
        jsonb_set(
          day_item.value,
          '{day}',
          to_jsonb((CASE day_item.ordinality
            WHEN 1 THEN 'monday'
            WHEN 2 THEN 'tuesday'
            WHEN 3 THEN 'wednesday'
            WHEN 4 THEN 'thursday'
            WHEN 5 THEN 'friday'
            WHEN 6 THEN 'saturday'
            WHEN 7 THEN 'sunday'
            ELSE COALESCE(day_item.value->>'day', '')
          END)::text),
          true
        ),
        '{label}',
        to_jsonb((CASE day_item.ordinality
          WHEN 1 THEN 'Segunda-feira'
          WHEN 2 THEN 'Terça-feira'
          WHEN 3 THEN 'Quarta-feira'
          WHEN 4 THEN 'Quinta-feira'
          WHEN 5 THEN 'Sexta-feira'
          WHEN 6 THEN 'Sábado'
          WHEN 7 THEN 'Domingo'
          ELSE COALESCE(day_item.value->>'label', '')
        END)::text),
        true
      )
      ORDER BY day_item.ordinality
    ) AS normalized_days
  FROM public.ebd_editorial_lessons AS lesson
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(lesson.documento->'days') = 'array' THEN lesson.documento->'days'
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS day_item(value, ordinality)
  GROUP BY lesson.id
)
UPDATE public.ebd_editorial_lessons AS lesson
SET documento = jsonb_set(lesson.documento, '{days}', normalized.normalized_days, true)
FROM normalized_documents AS normalized
WHERE lesson.id = normalized.id;
