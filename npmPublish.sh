#!/bin/bash
# This script is used to publish the npm package
for file in *.tgz; do
  echo "Publishing $file"
  if [ -f "$file" ] && [ -r "$file"]; then
    npm publish $file
    if [ $? -eq 0 ]; then
      echo "Successfully published $file"
    else
      echo "Failed to publish $file"
      exit 1
    fi
  else
    echo "$file skipping"
  fi
done
