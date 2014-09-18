#!/bin/bash

cd "$(dirname "$0")"

if hash n2pm 2>/dev/null; then
	npm install
	if [ $? -eq 0 ]; then
		grunt
	else
	    echo -e "\033[91mPackages failed to install.\033[39m Please check the above console output for errors before proceeding."
	fi
else
	echo -e "\033[91mYou'll need to install Node before getting started.\033[39m Press Return to open the homepage in your browser. Click the big Install button. Then rerun this command."
	read
	open http://nodejs.org
fi
