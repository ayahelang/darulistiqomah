#!/usr/bin/env bash
# apply-gallery-update.sh — bersihkan file salah + terapkan update grup galeri
# Jalankan dari ROOT REPO:
#   bash sdit-gallery-update/apply-gallery-update.sh
set -euo pipefail
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
info(){ echo -e "${CYAN}➜${NC} $*"; }; ok(){ echo -e "${GREEN}✓${NC} $*"; }; warn(){ echo -e "${YELLOW}!${NC} $*"; }; err(){ echo -e "${RED}✗${NC} $*"; }
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(pwd)"
WRONG_ROOT_FILES=(admin-index.html admin.js app.js site.json style.css sdit-gallery-groups-update.tar.gz sdit-gallery-update.zip)
UPDATE_FILES=(js/app.js js/admin.js admin/index.html css/style.css data/site.json)
pause(){ echo; read -r -p "Tekan Enter..." _; }
header(){ clear 2>/dev/null || true; echo -e "${BOLD}============================================${NC}"; echo -e "${BOLD}  SDIT — Gallery Groups Update${NC}"; echo -e "${BOLD}============================================${NC}"; echo -e " Repo: ${CYAN}${REPO_ROOT}${NC}"; echo; }

cleanup_wrong_files(){
  header; echo -e "${BOLD}[1] Hapus file salah di root${NC}"; echo
  local found=0
  for f in "${WRONG_ROOT_FILES[@]}"; do
    [[ -f "${REPO_ROOT}/${f}" ]] && { found=1; echo "  hapus: $f"; }
  done
  if [[ $found -eq 0 ]]; then ok "Root sudah bersih."; pause; return; fi
  read -r -p "Hapus? [y/N] " ans
  [[ "${ans,,}" != "y" && "${ans,,}" != "yes" ]] && { warn "Batal."; pause; return; }
  for f in "${WRONG_ROOT_FILES[@]}"; do
    [[ -f "${REPO_ROOT}/${f}" ]] && { rm -f "${REPO_ROOT}/${f}"; ok "Dihapus: $f"; }
  done
  pause
}

apply_update(){
  header; echo -e "${BOLD}[2] Terapkan update${NC}"; echo
  local SRC="${SCRIPT_DIR}"
  read -r -p "Pakai folder default (${SRC})? [Y/n] " use_default
  if [[ "${use_default,,}" == "n" || "${use_default,,}" == "no" ]]; then
    read -r -p "Path folder update: " SRC; SRC="${SRC/#\~/$HOME}"
  fi
  [[ ! -d "${SRC}" ]] && { err "Folder tidak ada: $SRC"; pause; return; }
  local missing=0
  for rel in "${UPDATE_FILES[@]}"; do
    [[ -f "${SRC}/${rel}" ]] && ok "Ada: $rel" || { err "Hilang: $rel"; missing=1; }
  done
  [[ $missing -eq 1 ]] && { err "Folder update tidak lengkap."; pause; return; }
  read -r -p "Salin sekarang? [y/N] " ans
  [[ "${ans,,}" != "y" && "${ans,,}" != "yes" ]] && { warn "Batal."; pause; return; }
  mkdir -p "${REPO_ROOT}/js" "${REPO_ROOT}/admin" "${REPO_ROOT}/css" "${REPO_ROOT}/data"
  cp -f "${SRC}/js/app.js" "${REPO_ROOT}/js/app.js"
  cp -f "${SRC}/js/admin.js" "${REPO_ROOT}/js/admin.js"
  cp -f "${SRC}/admin/index.html" "${REPO_ROOT}/admin/index.html"
  cp -f "${SRC}/css/style.css" "${REPO_ROOT}/css/style.css"
  cp -f "${SRC}/data/site.json" "${REPO_ROOT}/data/site.json"
  ok "5 file disalin ke path yang benar."
  pause
}

verify_files(){
  header; echo -e "${BOLD}[3] Verifikasi${NC}"; echo
  local all_ok=1
  for rel in "${UPDATE_FILES[@]}"; do
    if [[ -f "${REPO_ROOT}/${rel}" ]]; then
      if [[ "${rel}" == "admin/index.html" ]]; then
        grep -q "Grup Galeri dari Folder" "${REPO_ROOT}/${rel}" 2>/dev/null && ok "$rel (fitur OK)" || { err "$rel belum berisi fitur"; all_ok=0; }
      elif [[ "${rel}" == "js/admin.js" ]]; then
        grep -q "galleryGroups\|btnAddGalleryGroup\|scanGalleryGroupFolder" "${REPO_ROOT}/${rel}" 2>/dev/null && ok "$rel (fitur OK)" || { err "$rel belum berisi fitur"; all_ok=0; }
      else ok "$rel"; fi
    else err "$rel TIDAK ADA"; all_ok=0; fi
  done
  [[ $all_ok -eq 1 ]] && ok "Semua OK." || warn "Masih ada yang kurang — jalankan menu 2."
  pause
}

git_menu(){
  header; echo -e "${BOLD}[4] Git${NC}"; echo
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { err "Bukan git repo."; pause; return; }
  git status -sb || true; echo
  echo "  a) git add 5 file update"
  echo "  b) git add -A"
  echo "  c) commit"
  echo "  d) push"
  echo "  e) add + commit + push"
  echo "  0) kembali"
  read -r -p "Pilih: " g
  case "${g}" in
    a) git add js/app.js js/admin.js admin/index.html css/style.css data/site.json; ok "staged"; git status -sb ;;
    b) git add -A; ok "add -A"; git status -sb ;;
    c) read -r -p "Pesan [Fitur grup galeri folder]: " msg; git commit -m "${msg:-Fitur grup galeri folder}" || warn "commit gagal" ;;
    d) git push; ok "push" ;;
    e) git add js/app.js js/admin.js admin/index.html css/style.css data/site.json
       read -r -p "Pesan [Fitur grup galeri folder]: " msg
       git commit -m "${msg:-Fitur grup galeri folder}" || true
       git push; ok "selesai" ;;
  esac
  pause
}

all_in_one(){
  header; echo -e "${BOLD}[5] Bersihkan + Terapkan + Verifikasi${NC}"; echo
  read -r -p "Lanjut? [y/N] " ans
  [[ "${ans,,}" != "y" && "${ans,,}" != "yes" ]] && { warn "Batal."; pause; return; }
  for f in "${WRONG_ROOT_FILES[@]}"; do
    [[ -f "${REPO_ROOT}/${f}" ]] && { rm -f "${REPO_ROOT}/${f}"; ok "Dihapus: $f"; }
  done
  local SRC="${SCRIPT_DIR}" missing=0
  for rel in "${UPDATE_FILES[@]}"; do
    [[ -f "${SRC}/${rel}" ]] || { err "Hilang: $rel"; missing=1; }
  done
  [[ $missing -eq 1 ]] && { err "Folder update tidak lengkap."; pause; return; }
  mkdir -p "${REPO_ROOT}/js" "${REPO_ROOT}/admin" "${REPO_ROOT}/css" "${REPO_ROOT}/data"
  cp -f "${SRC}/js/app.js" "${REPO_ROOT}/js/app.js"
  cp -f "${SRC}/js/admin.js" "${REPO_ROOT}/js/admin.js"
  cp -f "${SRC}/admin/index.html" "${REPO_ROOT}/admin/index.html"
  cp -f "${SRC}/css/style.css" "${REPO_ROOT}/css/style.css"
  cp -f "${SRC}/data/site.json" "${REPO_ROOT}/data/site.json"
  ok "5 file disalin"
  grep -q "Grup Galeri dari Folder" "${REPO_ROOT}/admin/index.html" && ok "admin/index.html OK" || err "admin/index.html GAGAL"
  grep -q "galleryGroups\|btnAddGalleryGroup" "${REPO_ROOT}/js/admin.js" && ok "js/admin.js OK" || err "js/admin.js GAGAL"
  echo; ok "Selesai. Lanjut menu [4] untuk commit & push."
  pause
}

while true; do
  header
  echo -e "${BOLD}Menu:${NC}"
  echo "  1) Hapus file salah di root"
  echo "  2) Terapkan update"
  echo "  3) Verifikasi"
  echo "  4) Git: status / commit / push"
  echo "  5) Semua sekaligus (bersihkan + terapkan + verifikasi)"
  echo "  0) Keluar"
  read -r -p "Pilih [0-5]: " choice
  case "${choice}" in
    1) cleanup_wrong_files ;;
    2) apply_update ;;
    3) verify_files ;;
    4) git_menu ;;
    5) all_in_one ;;
    0) ok "Selesai."; exit 0 ;;
    *) warn "Tidak valid."; sleep 1 ;;
  esac
done
