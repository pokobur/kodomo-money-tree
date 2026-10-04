#!/bin/bash
set -e

echo "🔨 ビルドを開始します..."
npm run build

echo "🚀 GitHub Pages (gh-pages ブランチ) へデプロイしています..."
cd dist
rm -rf .git
git init -b gh-pages
git add -A
git commit -m "Deploy to GitHub Pages $(date +'%Y-%m-%d %H:%M:%S')"
git remote add origin https://github.com/pokobur/kodomo-money-tree.git
git push -f origin gh-pages
rm -rf .git
cd ..

echo "🎉 デプロイ完了！"
echo "GitHub リポジトリ設定 (Settings > Pages) で Branch を 'gh-pages' に設定すると数分で公開されます。"
