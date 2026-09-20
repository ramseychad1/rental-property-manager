-- Season date ranges now repeat every year, so they hold "MM-DD" only. Strip
-- the year from existing "YYYY-MM-DD" values (idempotent: right(x, 5) of an
-- already-"MM-DD" value is unchanged).
UPDATE "Season"
SET "dateRanges" = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'startDate', right(r ->> 'startDate', 5),
        'endDate', right(r ->> 'endDate', 5)
      )
    )
    FROM jsonb_array_elements("dateRanges") AS r
  ),
  '[]'::jsonb
)
WHERE jsonb_typeof("dateRanges") = 'array';
