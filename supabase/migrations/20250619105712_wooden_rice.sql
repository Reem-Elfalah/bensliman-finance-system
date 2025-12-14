/*
  # Add currency column to transactions table

  1. Changes
    - Add `currency` column to `transactions` table
    - Set default value to 'دولار' (Dollar)
    - Add check constraint for valid currency values

  2. Security
    - No changes to RLS policies needed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'currency'
  ) THEN
    ALTER TABLE transactions ADD COLUMN currency text NOT NULL DEFAULT 'دولار';
    
    -- Add check constraint for valid currency values
    ALTER TABLE transactions ADD CONSTRAINT transactions_currency_check 
    CHECK (currency IN (
      'دينار الليبي',
      'دينار التونسي', 
      'جني المصري',
      'ريممبي الصين',
      'دولار',
      'يورو',
      'باوند',
      'ليرة تركية',
      'جنى الاسترليني',
      'غرام ذهب',
      'غرام فضة',
      'الدرهم الإماراتي'
    ));
  END IF;
END $$;