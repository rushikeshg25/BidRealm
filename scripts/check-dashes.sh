#!/bin/sh
# This repo uses plain hyphens. Em dashes (U+2014) and en dashes (U+2013) are
# not used in source, comments, docs or copy.
#
# git grep exits 0 when it finds something, which is the failure case here.
if git grep -n -e '—' -e '–' -- ':(exclude)yarn.lock' ':(exclude)scripts/check-dashes.sh'; then
    echo ""
    echo "Error: em or en dashes found at the locations above. Use a plain hyphen (-)."
    exit 1
fi

echo "No em or en dashes found."
