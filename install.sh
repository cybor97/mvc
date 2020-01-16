unzip -o cybor97_mvc.zip -d /srv/cybor97_mvc;
rm -f cybor97_mvc.zip;
cd /srv/cybor97_mvc;
# rm -rf node_modules;
./build.sh;
pm2 restart all;
rm -f install.sh;