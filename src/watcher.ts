import fs from 'fs';

async function fileSetup(file) {
    const fd = await fs.promises.open(file, 'r');
    const statRes = await fs.promises.stat(file)
    return [fd, statRes.size];
}

function allowFilter(text, includes, excludes) {
    if(includes.length === 0 && excludes.length === 0) {
        return true
    }

    let allow_include = false, allow_exclude = true;

    for(let x = 0; x < includes.length; x++) {
        if(includes[x].test(text)) {
            allow_include = true
            break;
        }
    }

    for(let x = 0; x < excludes.length; x++) {
        if(excludes[x].test(text)) {
            allow_exclude = false;
            break
        }
    }

    return allow_include && allow_exclude;
}


const fds = {};

export const close = async function(file) {
    return fds[file].fd.close();
}

export const unwatch = async function(file) {
    await close(file);
    console.log('unwatch')
    fds[file].watcher.close();
    console.log("Unwatching: " + file)
}

export const init = async function(file, filter, cb) {
    
    fds[file] = {};
    let fileDetails = await fileSetup(file);
    fds[file].fd = fileDetails[0];
    fds[file].bufer = null;
    fds[file].offset = fileDetails[1];
    filter = filter || {};
    let data;

    if(!Array.isArray(filter.includes)) {
        filter.includes = []
    }

    if(!Array.isArray(filter.excludes)) {
        filter.excludes = []
    }
    
    fds[file].watcher = fs.watch(file, async (event) => {
        if(event == 'change') {
            const stat = await fs.promises.stat(file);
            const fd = fds[file];
            fd.delta = stat.size-fd.offset;

            if(fd.delta > 0) {

                fd.buffer = Buffer.alloc(fd.delta);
                
                await fd.fd.read(
                    fd.buffer, 
                    0,
                    fd.buffer.length, 
                    fd.offset
                );

                fd.offset += fd.delta;
                data = fd.buffer.toString();

                if (allowFilter(data, filter.includes, filter.excludes)) {
                    if (cb) {
                        cb({data: data, file: file});
                    } else {
                        console.log("NO CB PROVIDED: ");
                        console.log(data)
                    }
                }
            } else {
                await fd.fd.close();
                fileDetails = await fileSetup(file);
                fd.fd = fileDetails[0];
                fd.offset = fileDetails[1]
            }
        }
    });
}