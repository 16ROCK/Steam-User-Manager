chrome.runtime.sendMessage('onCompleted', response => {
    if(response){
        (() => {
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                if(/^(localStorage|sessionStorage|cookies)$/.test(message.type)){
                    set_messages(message);
                }
            });
            let messages = document.createElement('div');
            messages.id = `messages_${chrome.runtime.id}`;
            document.querySelector('html').appendChild(messages);
            messages.active = true;

            new MutationObserver(records  => {
                if(messages.active){
                    for(let data of records.filter(record => record.addedNodes.length).map(record => JSON.parse(record.addedNodes[0].textContent))){
                        chrome.runtime.sendMessage(data);
                    }
                }
                messages.active = true;
            }).observe(messages, {
                childList: true,
                characterData: true
            });

            let set_messages = value => {
                messages.active = false;
                messages.textContent = '';
                return messages.textContent = JSON.stringify(value);
            };
            let script = document.createElement('script');
            script.setAttribute('type', 'text/javascript');
            script.innerHTML = `(() => {
                    const messages = document.querySelector('html>#messages_${chrome.runtime.id}');
                    messages.active = true;

                    new MutationObserver(records  => {
                        if(messages.active){
                            for(let data of records.filter(record => record.addedNodes.length).map(record => JSON.parse(record.addedNodes[0].textContent))){
                                get_messages(data);
                            }
                        }
                        messages.active = true;
                    }).observe(messages, {
                        childList: true,
                        characterData: true
                    });

                    let set_messages = value => {
                        messages.active = false;
                        messages.textContent = '';
                        return messages.textContent = JSON.stringify(value);
                    };
                    const hostname = '${location.hostname}',
                    pathname = '${location.pathname}',
                    protocol = '${location.protocol}',
                    suffix = [],
                    storage = {
                        localStorage: {
                            length: 0
                        },
                        sessionStorage: {
                            length: 0
                        }
                    };

                    let p = p => p.replace(/^\\.*/, '').split(/([\\\/\.])/).filter(p => p), d = d => p(d).reverse();

                    function checkDomain(domain1, domain2, hostOnly){
                        for(let i = 0; i < domain1.length && i < domain2.length; i++){
                            if(domain1[i] != domain2[i]){
                                return false;
                            }
                        }
                        return hostOnly ? domain1.length == domain2.length : domain1.length >= domain2.length;
                    };

                    function checkPath(path1, path2){
                        for(let i = 0; i < path1.length && i < path2.length; i++){
                            if(path1[i] != path2[i]){
                                return false; 
                            }
                        }
                        return path1.length >= path2.length
                    };

                    let cookies = [];

                    let setCookie = strCookie => {
                        strCookie = strCookie.split(';');
                        let cookie = strCookie.shift(),
                        name = (cookie.match(/^([^=]*)*=/) || []).pop() || '',
                        value = (cookie.match(/=(.*)*$/) || []).pop() || '';
                        strCookie = \`;\${strCookie.join(';')}\`;

                        let date = Math.trunc(Date.now() / 1000),
                        expires = strCookie.split(/;\\s*expires=([^;]*)/gi).filter((t, i) => i % 2).pop(),
                        max_age = strCookie.split(/;\\s*max-age=([^;]*)/gi).filter((t, i) => i % 2).pop(),
                        domain = strCookie.split(/;\\s*domain=([^;]*)/gi).filter((t, i) => i % 2).pop(),
                        sameSite = strCookie.split(/;\\s*samesite=([^;]*)/gi).filter((t, i) => i % 2).pop(),
                        path = strCookie.split(/;\\s*path=([^;]*)/gi).filter((t, i) => i % 2).pop() || pathname;
                        expires = expires && Math.trunc(Date.parse(expires) / 1000);
                        max_age = max_age && Math.trunc((new Date()).setSeconds(max_age) / 1000);
                        sameSite = sameSite ? /^none$/i.test(sameSite) ? 'no_restriction' : /^strict/i.test(sameSite) ? 'strict' : 'lax' : 'unspecified';
                        domain = domain && domain.replace(/^\\.*/, '.');
                        domain = domain || hostname;
                        let secure = /;\\s*secure;?/i.test(strCookie),
                        httpOnly = /;\\s*httponly;?/i.test(strCookie),
                        hostOnly = !domain,
                        expirationDate = expires || max_age,
                        session = !expirationDate;
                        cookie = {domain, hostOnly, httpOnly, name, path, sameSite, secure, session, storeId: "0", value};
                        if(!session){
                            cookie.expirationDate = expirationDate;
                        }
                        if((name || value) && checkDomain(d(hostname), d(cookie.domain), cookie.hostOnly) && suffix.includes(cookie.domain.replace(/^\\.*/, ''))){
                            if(cookie.sameSite != 'no_restriction' || cookie.secure){
                                if(!cookie.secure || protocol == 'https:'){
                                    if(!cookie.httpOnly){
                                        let n = cookies.findIndex(c => c.name == cookie.name && c.domain == cookie.domain && c.path == cookie.path);
                                        if(n < 0){
                                            n = cookies.length;
                                        }
                                        cookies[n] = cookie;
                                        cookies = cookies.filter(cookie => cookie.session || cookie.expirationDate > date);
                                        cookies.sort((a, b) => b.path.length - a.path.length);
                                        return cookie;
                                    }
                                }
                            }
                        }
                        return false;
                    };

                    document.__defineGetter__('cookie', () => {
                        let date = Math.trunc(Date.now() / 1000);
                        cookies = cookies.filter(cookie => cookie.session || cookie.expirationDate > date);
                        return cookies.map(cookie => \`\${cookie.name}=\${cookie.value}\`).join('; ');
                    });

                    document.__defineSetter__('cookie', value => {
                        set_messages({type: 'cookies', initiator: 'cookies', event: 'setCookie', value, cookie: setCookie(value)});
                        return value;
                    });

                    for(let name in storage){
                        Object.defineProperty(window, name, {
                            value: new Proxy(storage[name], {
                                set: (oTarget, sKey, value) => {
                                    let size = 0;
                                    for(let key in oTarget){
                                        if(!/^(length|setItem|getItem|key|removeItem|clear)$/.test(key)){
                                            if(key != String(sKey)){
                                                size += key.length + oTarget[key].length;
                                            }else{
                                                size += String(sKey).length + String(value).length;
                                            }
                                        }
                                    }
                                    if(5242880 < size){
                                        let Failed = new TypeError(\`Failed to set a named property on 'Storage': Setting the value of '\${String(sKey)}' exceeded the quota.\`);
                                        Failed.stack = Failed.stack.replace(/\\n\\s*at\\s*Object\\.set\\s*\\(<anonymous>:\\d*:\\d*\\)/, '');
                                        throw Failed;
                                    }
                                    if(!/^(length|setItem|getItem|key|removeItem|clear)$/.test(String(sKey))){
                                        if(String(sKey) in oTarget){
                                            if(oTarget[String(sKey)] != String(value)){
                                                set_messages({type: name, initiator: name, event: 'setItem', key: String(sKey), value: String(value)});
                                            }
                                        }else{
                                            set_messages({type: name, initiator: name, event: 'setItem', key: String(sKey), value: String(value)});
                                        }
                                    }
                                    oTarget[String(sKey)] = /^(setItem|getItem|key|removeItem|clear)$/.test(String(sKey)) ? value : String(value);
                                    oTarget.length = Object.keys(oTarget).filter(key => !/^(length|setItem|getItem|key|removeItem|clear)$/.test(key)).length;
                                    return oTarget[String(sKey)];
                                },
                                get: (oTarget, sKey) => {
                                    if(sKey in oTarget){
                                        return oTarget[sKey];
                                    }else{
                                        if(sKey == 'length'){
                                            return oTarget.length = Object.keys(oTarget).filter(key => !/^(length|setItem|getItem|key|removeItem|clear)$/.test(key)).length;
                                        }
                                        if(sKey == 'setItem'){
                                            let fun = function(){return setItem(...arguments);};
                                            function setItem(key, value){
                                                if(arguments.length < 2){
                                                    let Failed = new TypeError(\`Failed to execute 'setItem' on 'Storage': 2 argument required, but only \${arguments.length} present.\`),
                                                    err = Failed.stack.split(/\\n/);
                                                    err.splice(1, 2);
                                                    Failed.stack = err.join('\\n');
                                                    throw Failed;
                                                }
                                                let size = 0;
                                                for(let sKey in oTarget){
                                                    if(!/^(length|setItem|getItem|key|removeItem|clear)$/.test(sKey)){
                                                        if(sKey != String(key)){
                                                            size += sKey.length + oTarget[sKey].length;
                                                        }else{
                                                            size += String(key).length + String(value).length;
                                                        }
                                                    }
                                                }

                                                if(5242880 < size){
                                                    let Failed = new TypeError(\`Failed to set a named property on 'Storage': Setting the value of '\${String(key)}' exceeded the quota.\`);
                                                    Failed.stack = Failed.stack.replace(/\\n\\s*at\\s*Object\\.setItem\\s*\\(<anonymous>:\\d*:\\d*\\)/, '');
                                                    throw Failed;
                                                }
                                                if(!/^(length|setItem|getItem|key|removeItem|clear)$/.test(String(key))){
                                                    if(String(key) in oTarget){
                                                        if(oTarget[String(key)] != String(value)){
                                                            set_messages({type: name, initiator: name, event: 'setItem', key: String(key), value: String(value)});
                                                        }
                                                    }else{
                                                        set_messages({type: name, initiator: name, event: 'setItem', key: String(key), value: String(value)});
                                                    }
                                                    oTarget[String(key)] = String(value);
                                                }
                                                oTarget.length = Object.keys(oTarget).filter(key => !/^(length|setItem|getItem|key|removeItem|clear)$/.test(key)).length;
                                            };
                                            fun.toString = () => 'function setItem() { [native code] }';
                                            fun.toString.toString = () => 'function toString() { [native code] }';
                                            return fun;
                                        }
                                        if(sKey == 'getItem'){
                                            let fun = function(){return getItem(...arguments);};
                                            function getItem(key){
                                                if(!arguments.length){
                                                    let Failed = new TypeError("Failed to execute 'getItem' on 'Storage': 1 argument required, but only 0 present."),
                                                    err = Failed.stack.split(/\\n/);
                                                    err.splice(1, 2);
                                                    Failed.stack = err.join('\\n');
                                                    throw Failed;
                                                }
                                                return String(key) in oTarget ? oTarget[String(key)] : null;
                                            };
                                            fun.toString = () => 'function getItem() { [native code] }';
                                            fun.toString.toString = () => 'function toString() { [native code] }';
                                            return fun;
                                        }
                                        if(sKey == 'key'){
                                            let fun = function(){return key(...arguments);};
                                            function key(key){
                                                if(!arguments.length){
                                                    let Failed = new TypeError("Failed to execute 'key' on 'Storage': 1 argument required, but only 0 present."),
                                                    err = Failed.stack.split(/\\n/);
                                                    err.splice(1, 2);
                                                    Failed.stack = err.join('\\n');
                                                    throw Failed;
                                                }
                                                return Object.keys(oTarget).filter(key => !/^(length|setItem|getItem|key|removeItem|clear)$/.test(key))[Math.floor(key) || 0] || null;
                                            };
                                            fun.toString = () => 'function key() { [native code] }';
                                            fun.toString.toString = () => 'function toString() { [native code] }';
                                            return fun;
                                        }
                                        if(sKey == 'removeItem'){
                                            let fun = function(){return removeItem(...arguments);};
                                            function removeItem(key){
                                                if(!arguments.length){
                                                    let Failed = new TypeError("Failed to execute 'removeItem' on 'Storage': 1 argument required, but only 0 present."),
                                                    err = Failed.stack.split(/\\n/);
                                                    err.splice(1, 2);
                                                    Failed.stack = err.join('\\n');
                                                    throw Failed;
                                                }
                                                if(String(key) in oTarget && !/^(length|setItem|getItem|key|removeItem|clear)$/.test(String(key))){
                                                    set_messages({type: name, initiator: name, event: 'removeItem', key: String(key)});
                                                    delete oTarget[String(key)];
                                                    oTarget.length = Object.keys(oTarget).filter(key => !/^(length|setItem|getItem|key|removeItem|clear)$/.test(key)).length;
                                                }
                                            };
                                            fun.toString = () => 'function removeItem() { [native code] }';
                                            fun.toString.toString = () => 'function toString() { [native code] }';
                                            return fun;
                                        }
                                        if(sKey == 'clear'){
                                            let fun = () => clear(),
                                            clear = () => {
                                                for(let key in oTarget){
                                                    delete oTarget[key];
                                                }
                                                oTarget.length = 0;
                                                set_messages({type: name, initiator: name, event: 'clear'});
                                            };
                                            fun.toString = () => 'function clear() { [native code] }';
                                            fun.toString.toString = () => 'function toString() { [native code] }';
                                            return fun;
                                        }
                                    }
                                },
                                deleteProperty: (oTarget, sKey) => {
                                    if(sKey in oTarget && !/^(length|setItem|getItem|key|removeItem|clear)$/.test(String(sKey))){
                                        set_messages({type: name, initiator: name, event: 'removeItem', key: String(sKey)});
                                        delete oTarget[sKey];
                                        oTarget['length'] = Object.keys(oTarget).filter(key => key != 'length').length;
                                    }
                                    return true;
                                },
                                ownKeys: (oTarget) => Object.keys(oTarget).filter(key => key != 'length')
                            })
                        });
                    }
                    let get_messages = data => {
                        if(/^(localStorage|sessionStorage)$/.test(data.type)){
                            let oTarget = storage[data.type];
                            if(data.event == 'setItems'){
                                for(let key of Object.keys(oTarget).filter(key => !/^length$/.test(key))){
                                    delete oTarget[key];
                                }
                                for(let key in data[data.type]){
                                    oTarget[key] = data[data.type][key];
                                }
                                oTarget.length = Object.keys(oTarget).filter(key => !/^(length|setItem|getItem|key|removeItem|clear)$/.test(key)).length;
                            }
                            if(data.event == 'setItem'){
                                oTarget[data.key] = data.value;
                                oTarget.length = Object.keys(oTarget).filter(key => !/^(length|setItem|getItem|key|removeItem|clear)$/.test(key)).length;
                            }
                            if(data.event == 'removeItem'){
                                delete oTarget[data.key];
                                oTarget.length = Object.keys(oTarget).filter(key => !/^(length|setItem|getItem|key|removeItem|clear)$/.test(key)).length;
                            }
                            if(data.event == 'clear'){
                                for(let key in oTarget){
                                    delete oTarget[key];
                                }
                                oTarget.length = 0;
                            }
                        }
                        if(data.type == 'suffix' && data.event == 'setItems'){
                            suffix.push(...data.suffix);
                        }
                        if(data.type == 'cookies' && data.event == 'setItems'){
                            cookies.length = 0;
                            cookies.push(...data.cookies);
                        }
                        if(data.type == 'cookies' && data.event == 'setCookie'){
                            setCookie(data.value);
                        }
                    };
                })();`;
            document.querySelector('html').appendChild(script);
            script.remove();
            messages.remove();
            for(let name in response){
                set_messages({
                    event: 'setItems',
                    type: name,
                    [name]: response[name]
                });
            }
        })();
    }
});