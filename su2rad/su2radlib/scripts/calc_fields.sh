#!/bin/bash

if [ $# = 0 ]; then
    echo -e "\n    usage:    $0 <octree>\n" >&2
    exit 1
fi

OCTREE=$1
if [ ! -f ${OCTREE} ]; then
    echo "octree file '${OCTREE}' does not exist." >&2
    exit 1
fi

RPICT_OPTS="-w -h -oodv -ab 2 -ad 2048 -as 512 -I+"

for field in `find . -name '*.fld'`; 
do
    echo "calculating field '${field}' ..."
    fname=`basename ${field} .fld`
    fielddir=`dirname ${field}`
    luxfile="${fielddir}/${fname}.lux"
    if [ -f ${luxfile} ]; then
        rm -rf ${luxfile}
    fi
    
    cat ${field} | rtrace ${RPICT_OPTS} ${OCTREE} | rcalc -e '$1=$1; $2=$2; $3=$3-1; $4=$4; $5=$5; $6=-1*$6; $7=($7*0.265+$8*0.670+$9*0.065)*179' > ${luxfile}
    
done
