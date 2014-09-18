#!/bin/bash

cd "$(dirname "$0")"

if ! hash npm 2>/dev/null; then
	echo -e "\033[91mYou'll need to install Node before getting started.\033[39m You'll have to type your system password below to proceed:"
	sudo mkdir -p /usr/local/{share/man,bin,lib/node,include/node}
	sudo chown -R $USER /usr/local/{share/man,bin,lib/node,include/node}

	curl https://www.npmjs.org/install.sh | sh
fi

npm install
if [ $? -eq 0 ]; then
	grunt
else
    echo -e "\033[91mPackages failed to install.\033[39m Please check the above console output for errors before proceeding."
fi
