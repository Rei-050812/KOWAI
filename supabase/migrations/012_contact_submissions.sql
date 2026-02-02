-- お問い合わせフォーム用テーブル
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_is_read ON contact_submissions(is_read);

-- RLS（Row Level Security）を有効化
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- 匿名ユーザーからの挿入を許可
CREATE POLICY "Allow anonymous insert" ON contact_submissions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 認証済みユーザー（管理者）のみ閲覧・更新可能
CREATE POLICY "Allow authenticated read" ON contact_submissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated update" ON contact_submissions
  FOR UPDATE
  TO authenticated
  USING (true);
