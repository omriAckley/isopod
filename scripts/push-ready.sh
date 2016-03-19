git remote update
if [[ $? -ne 0 ]]; then
  exit 1
fi
git merge-base --is-ancestor @{u} @
if [[ $? -ne 0 ]]; then
  printf "\e[31m×\e[0m Local is behind origin (pull/fetch to synchronize before pushing)\n"
  exit 1
else
  printf "\e[32m✓\e[0m Local is at or ahead of origin (push away)\n"
fi