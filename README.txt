Fix like/komentar terkait ke foto/video yang salah

Sebelumnya target ID = index array (gallery:0, galleryGroupFile:0:2)
yang berubah saat sort/reorder → like foto A muncul di foto C.

Sekarang ID stabil:
- foto: path gambar (folder/file)
- video: driveFileId / youtubeId / url

Catatan: like/komentar lama berbasis index tidak otomatis pindah.
