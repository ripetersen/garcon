NOW=$(date -u +%Y%m%d%H%M%S)
mkdir -p build/src
rm -rf build/src
rsync -arvLP --files-from=srcfiles.txt . build/src/
cd build
sed -i "s/_BUILD_DATE_/${NOW}/" src/config/base/about.json
tar -cvf pennant-api-${NOW}.tar -C src/ .
rm -f pennant-api.tar
ln -s pennant-api-${NOW}.tar pennant-api.tar
cd ..
#tar --exclude=node_modules --dereference -cvf build/pennant-api.tar catalog/ config/ services src package.json package-lock.json LICENSE.md
