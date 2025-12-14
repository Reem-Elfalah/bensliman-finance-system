/*
  # Create transactions table for money transaction app

  1. New Tables
    - `transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `type` (text, transaction type: exit, sell_to, buy, entry)
      - `created_at` (timestamp)
      - `from_account` (text, optional - for exit transactions)
      - `to_account` (text, optional - for entry transactions)
      - `name` (text, optional - for sell_to and buy transactions)
      - `amount` (numeric, required)
      - `country_city` (text, required)
      - `deliver_to` (text, optional - for exit and entry transactions)
      - `paper_category` (text, required)
      - `price` (numeric, required)
      - `notes` (text, optional)

  2. Security
    - Enable RLS on `transactions` table
    - Add policies for authenticated users to manage their own transactions
*/

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('exit', 'sell_to', 'buy', 'entry')),
  created_at timestamptz DEFAULT now(),
  from_account text,
  to_account text,
  name text,
  amount numeric NOT NULL CHECK (amount > 0),
  country_city text NOT NULL,
  deliver_to text,
  paper_category text NOT NULL,
  price numeric NOT NULL CHECK (price > 0),
  notes text
);

-- Enable Row Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
  ON transactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
  ON transactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_created_at_idx ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS transactions_type_idx ON transactions(type);