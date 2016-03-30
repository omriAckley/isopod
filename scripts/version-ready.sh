(npm run build && git add dist && npm test && bash "$(dirname ${BASH_SOURCE[0]})/push-ready.sh")
if [[ $? -ne 0 ]]; then
  git reset HEAD dist
  git checkout -- dist
  printf "\e[31m×\e[0m Address above issues before bumping version"
  exit 1
fi