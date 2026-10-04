-- ============================================================
-- 08. 親による子プロファイル削除 RLS ポリシー
-- ============================================================

-- 親が自分のファミリーの子どもユーザーを削除可能
CREATE POLICY "Parents can delete child profiles"
  ON public.users FOR DELETE
  USING (
    family_id = public.get_my_family_id()
    AND public.get_my_role() = 'PARENT'
    AND role = 'CHILD'
  );

-- 親が自分のファミリーの口座を削除可能（ユーザー削除のカスケード対応）
CREATE POLICY "Parents can delete family accounts"
  ON public.accounts FOR DELETE
  USING (
    family_id = public.get_my_family_id()
    AND public.get_my_role() = 'PARENT'
  );
