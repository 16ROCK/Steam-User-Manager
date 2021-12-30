(() => {
	localStorage.dialog_heading = localStorage.dialog_content = localStorage.dialog_button = localStorage.dialog_twofa = localStorage.dialog_LoadingWrapper = localStorage.scrollTop = '';
	const subtle = window.crypto.subtle,
	importKey = s => subtle.importKey('raw', new Uint8Array(typeof s == 'string' ? /^[\da-f]{40}$/.test(s) ? s.match(/.{1,2}/g).map(h => parseInt(h, 16)) : [...atob(s)].map(s => s.charCodeAt()) : s), {name: 'HMAC', hash: { name: 'SHA-1'}}, false, ['sign']);

	async function genAuthCode(shared_secret){
	  let key = await importKey(shared_secret);
	  let HMAC = await subtle.sign('HMAC', key, new Uint8Array(new Uint32Array([Math.trunc(Date.now() / 30000), 0]).buffer).reverse());
	  HMAC = new Uint8Array(HMAC);
	  let start = HMAC[19] & 0x0F;
	  HMAC = new Uint8Array(HMAC.slice(start, start + 4));
	  let fullcode = new DataView(HMAC.buffer).getUint32(0) & 0x7FFFFFFF, chars = '23456789BCDFGHJKMNPQRTVWXY', code = '';
	  for(let i = 0; i < 5; i++) code += chars.charAt(fullcode % chars.length), fullcode /= chars.length;
	  return code;
	};

	async function genConfKey(identity_secret, time, tag = 'conf'){
	  let key = await importKey(identity_secret);
	  let HMAC = await subtle.sign('HMAC', key, new Uint8Array([...new Uint8Array(new Uint32Array([time, 0]).buffer).reverse(), ...[...tag].map(s => s.charCodeAt())]));
	  return btoa([...new Uint8Array(HMAC)].map(n => String.fromCharCode(n)).join(''));
	};

	async function genConfParams(identity_secret, device_id, steamid, tag = 'conf'){
	  let time = Math.trunc(Date.now() / 1000);
	  return `p=${device_id}&a=${steamid}&k=${await genConfKey(identity_secret, time, tag)}&t=${time}&m=android&tag=${tag}`;
	};

	async function sha1(str){
	  return await subtle.digest({name: "SHA-1"}, new Uint8Array(str.match(/.{1}/g).map(s => s.charCodeAt()))).then(result => [...new Uint8Array(result)].map(n => n.toString(16)).join(''));
	};

	async function deviceId(id){
	  return await sha1(id).then(result => result.replace(/^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12}).*$/, 'android:$1-$2-$3-$4-$5'));
	};
	let confTabs = {};
	async function mobileconf(id){
		let account = accounts[id];
		if(!(confTabs[id] && !confTabs[id].closed)){
			let httpParams = (tag = 'conf') => genConfParams(account.identity_secret, account.device_id, account.steamid, tag),
			conf_progress = false;
			account.ConfLink = account.ConfLink || `https://steamcommunity.com/mobileconf/conf?${await httpParams()}`;
			let tab = window.open('\mobileconf.html', id, 'height=768,width=512,resize=yes,scrollbars=yes');
			confTabs[id] = tab;
			tab.document.title = `${account.login} :: Mobile confirmation`;
			async function refresh(){
				if(!account.ConfLink){
					account.ConfLink = `https://steamcommunity.com/mobileconf/conf?${await httpParams()}`;
				}
				req('get', account.ConfLink, null, {[`${chrome.runtime.id}_id`]: id}).done(data => {
	                if(/<div\s*id="mobileconf_empty"\s*class="mobileconf_header">/.test(data)){
						account.ConfLink = null;
	                }
					let g_strLanguage = data.match(/g_strLanguage\s*=\s*"([^"]*)";/),
	                g_CommunityPreferences = data.match(/g_CommunityPreferences\s*=\s*([\s\S]*?);\r\n\t/),
	                g_bAllowAppImpressions = data.match(/g_bAllowAppImpressions\s*=\s*(.*)\s/),
	                g_steamID = data.match(/g_steamID\s*=\s*"([^"]*)";/),
	                g_sessionID = data.match(/g_sessionID\s*=\s*"([^"]*)";/),
	                g_SNR = data.match(/g_SNR\s*=\s*'([^']*)';/);
					if(g_strLanguage && g_CommunityPreferences && g_bAllowAppImpressions && g_steamID && g_sessionID && g_SNR){
						tab.g_strLanguage = g_strLanguage = g_strLanguage[1];
						tab.g_CommunityPreferences = JSON.parse(g_CommunityPreferences[1]);
						tab.g_bAllowAppImpressions = JSON.parse(g_bAllowAppImpressions[1]);
						tab.g_steamID = g_steamID[1];
						tab.g_sessionID = g_sessionID[1];
						tab.g_SNR = g_SNR[1];
					}else{
						return;
					}
					let mobileconf = tab.document.createElement('html');
					mobileconf.innerHTML = data;
					mobileconf.querySelector('link[rel="shortcut icon"][type="image/x-icon"]').href = mobileconf.querySelector('#global_actions>.user_avatar.playerAvatar>img').src;
					mobileconf.querySelector('title').innerText = `${account.login} :: Mobile confirmation`;
	                for(let script of mobileconf.querySelectorAll('script')){
	                	script.remove();
	                }
					mobileconf.querySelectorAll('a[href]').forEach(a => a.removeAttribute('href'));
					mobileconf.querySelector('head').insertAdjacentHTML('beforeend', '<link href="/mobileconf.css" rel="stylesheet" type="text/css">');
					mobileconf.querySelector('body').insertAdjacentHTML('beforeend', '<div id="select_all"></div>');
					function addScripts(src, cb){
						if(src.length){
					        let script = tab.document.createElement('script');
					        script.setAttribute('type', 'text/javascript');
					        script.src = `/mobileconf/${src.shift()}.js`;
					        tab.document.querySelector('head').appendChild(script);
					        script.onload = () => {
					        	addScripts(src, cb);
					        }
						}else{
							cb();
						}
					}
					if(conf_progress){
	                    tab.document.querySelector('.responsive_page_template_content').innerHTML = mobileconf.querySelector('.responsive_page_template_content').outerHTML;
						addScripts([`${g_strLanguage}/mobileconf`], () => {
	                        tab.g_bClickInProgress = false;
	                        tab.history.replaceState('', '', '/mobileconf');
						});

					}else{
						tab.document.querySelector('html').innerHTML = mobileconf.outerHTML;
						addScripts(['XMLHttpRequest', 'script 1', 'prototype-1.7', 'script 2', '_combined', `${g_strLanguage}/global`, 'jquery-1.11.1.min', 'tooltip', `${g_strLanguage}/shared_global`, 'CDelayedAJAXData', 'script 3', 'jquery-ui-1.9.2.min', `${g_strLanguage}/mobileconf`, 'economy_common', `${g_strLanguage}/economy`, 'modalv2', 'modalContent', `${g_strLanguage}/shared_responsive_adapter`, 'script 4', 'script 5'],
							() => {
								conf_progress = true;
								tab.document.querySelector('.responsive_header').onclick = refresh;
								tab.document.querySelector('#select_all').onclick = () => tab.document.querySelectorAll('.mobileconf_list_checkbox>input').forEach(checkbox => checkbox.click());
								tab.GetValueFromLocalURL = (url, timeout, success) => httpParams(new URL(url).searchParams.get('arg1').replace(/\d/g, '')).then(httpParams => success(httpParams));
	                        	tab.history.replaceState('', '', '/mobileconf');
							}
						);
					}
					new MutationObserver(() => tab.document.querySelectorAll('a[href]').forEach(a => a.removeAttribute('href'))).observe(tab.document.querySelector('#mobileconf_details'), {
					    childList: true,
					    subtree: true,
					    characterDataOldValue: false
					});
				});
			};
			refresh();
		}else{
			confTabs[id].focus();
		}
	};
    let suffixList;
    chrome.storage.local.get('suffixList', result => {
        if(result.suffixList){
            suffixList = result.suffixList;
            updateSuffixList();
        }else{
            req('get', chrome.extension.getURL('suffixList.json')).done(data => {
                suffixList = data;
                updateSuffixList();
            });
        }
    });

    let p = p => p.replace(/^\.*/, '').split(/([\/\.])/).filter(p => p), d = d => p(d).reverse();

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

    function checksuffix(domain){
        if(suffixList.length){
            for(let suffix of suffixList){
                if(new RegExp(`\^${domain.replace(/^\./, '\\.?')}$`, 'i').test(suffix)){
                    return false;
                }
            }
        }
        return true;
    };

    function updateSuffixList(){
        req('get', `https://publicsuffix.org/list/public_suffix_list.dat?v=${Math.trunc(Date.now() / 1000 / 60 / 60 / 24 / 7)}`).done(data => {
            let publicSuffixList = data.split(/\n/).filter(suffix => !/^\/\//.test(suffix) && suffix).map(suffix => new URL(`chrome:/${suffix.replace(/^\*\./, '.').replace(/^!/, '').toLowerCase()}`).hostname);
            if(publicSuffixList.length){
                suffixList = (arr => arr.filter((str, i) => arr.indexOf(str) == i))(suffixList.concat(...publicSuffixList));
                chrome.storage.local.set({suffixList});
                setTimeout(() => updateSuffixList(), 604800000);
            }else{
                setTimeout(() => updateSuffixList(), 300000);
            }
        }).fail(() => setTimeout(() => updateSuffixList(), 300000));
    };

    let cookies = {

        chrome: {
            getAll: (domains, cb) => {
                let count = 0, cookiesAll = [];
                domains = Array.isArray(domains) ? domains : [domains];
                for(let domain of domains){
                    chrome.cookies.getAll({domain: domain}, cookies => {
                        cookiesAll.push(...cookies);
                        if(++count == domains.length){
                            cb(cookiesAll);
                        }
                    });
                }
            },

            remove: (cookies, cb = () => null) => {
                let count = 0;
                cookies = Array.isArray(cookies) ? cookies : [cookies];
                if(cookies.length){
                    for(let cookie of cookies){
                        chrome.cookies.remove({
                            url: `http${cookie.secure ? 's' : ''}://${cookie.domain.replace(/^\./, '')}${cookie.path}`,
                            name: cookie.name,
                            storeId: cookie.storeId || '0'
                        }, () => {
                            if(++count == cookies.length){
                                cb();
                            }
                        });
                    }
                }else{
                    cb();
                }
            },

            set: (cookies, cb = () => null) => {
                let count = 0;
                cookies = Array.isArray(cookies) ? cookies : [cookies];
                if(cookies.length){
                    for(let cookie of cookies){
                        chrome.cookies.set({
                            url: `http${cookie.secure ? 's' : ''}://${cookie.domain.replace(/^\./, '')}${cookie.path}`,
                            name: cookie.name,
                            value: cookie.value,
                            domain: cookie.hostOnly ? null : cookie.domain,
                            secure: cookie.secure,
                            httpOnly: cookie.httpOnly,
                            sameSite: cookie.sameSite,
                            expirationDate: cookie.expirationDate,
                            storeId: cookie.storeId || '0'
                        }, () => {
                            if(++count == cookies.length){
                                cb();
                            }
                        });
                    }
                }else{
                    cb();
                }
            }
        },

        switch: (id, cb = () => null) => {
            cookies.chrome.getAll(['steampowered.com', 'steamcommunity.com', 'steam.tv'], cookie => {
                cookies.chrome.remove(cookie, () => {
                    cookies.chrome.set(accounts[id].cookies, () => {
                        cb();
                    });
                });
            });
        },

        get: (id, domain, name) => cookies.getAll(id, domain).find(cookie => cookie.name == name),

        getAll: (id, domain, pathname, protocol, js, method, type, initiator) => {

            let account = accounts[id],
            date = Math.trunc(Date.now() / 1000);

            account.cookies = account.cookies.filter(cookie => cookie.session || cookie.expirationDate > date);

            let cookies = account.cookies.filter(cookie => {
                if(!domain || (protocol ? checkDomain(d(domain), d(cookie.domain), cookie.hostOnly) : checkDomain(d(cookie.domain), d(domain)))){
                    if(!pathname || checkPath(p(pathname || '/'), p(cookie.path))){
                        if(!protocol || !cookie.secure || protocol == 'https:'){
                            if(!cookie.httpOnly || !js){
                                if(/^(lax|unspecified|strict)$/.test(cookie.sameSite)){
                                    if(!initiator || `chrome-extension://${chrome.runtime.id}` == initiator || `${protocol}//${domain}` == initiator){
                                        return true;
                                    }
                                    if(cookie.sameSite != 'strict'){
                                        return type == 'main_frame' && method == "GET";;
                                    }
                                }else{
                                    return true;
                                }
                            }
                        }
                    }
                }
                return false;
            })
            return cookies;

        },

        set: (id, js, protocol, domain, pathname, strCookie) => {
            strCookie = strCookie.split(';');
            let cookie = strCookie.shift(),
            name = (cookie.match(/^([^=]*)*=/) || []).pop() || '',
            value = (cookie.match(/=(.*)*$/) || []).pop() || '';
            strCookie = `;${strCookie.join(';')}`;
            let account = accounts[id],
            date = Math.trunc(Date.now() / 1000);

            let expires = strCookie.split(/;\s*expires=([^;]*)/gi).filter((t, i) => i % 2).pop(),
            max_age = strCookie.split(/;\s*max-age=([^;]*)/gi).filter((t, i) => i % 2).pop(),
            domain2 = strCookie.split(/;\s*domain=([^;]*)/gi).filter((t, i) => i % 2).pop(),
            sameSite = strCookie.split(/;\s*samesite=([^;]*)/gi).filter((t, i) => i % 2).pop(),
            path = strCookie.split(/;\s*path=([^;]*)/gi).filter((t, i) => i % 2).pop() || pathname;

            expires = expires && Math.trunc(Date.parse(expires) / 1000);
            max_age = max_age && Math.trunc((new Date()).setSeconds(max_age) / 1000);
            sameSite = sameSite ? /^none$/i.test(sameSite) ? 'no_restriction' : /^strict/i.test(sameSite) ? 'strict' : 'lax' : 'unspecified';
            domain2 = domain2 && domain2.replace(/^\.*/, '.');

            let secure = /;\s*secure;?/i.test(strCookie),
            httpOnly = /;\s*httponly;?/i.test(strCookie),
            hostOnly = !domain2;
            domain2 = domain2 || domain,
            expirationDate = expires || max_age;
            session = !expirationDate;

            cookie = {
                domain: domain2,
                hostOnly,
                httpOnly,
                name,
                path,
                sameSite,
                secure,
                session,
                storeId: "0",
                value
            };

            if(!session){
                cookie.expirationDate = expirationDate;
            }

            if((name || value) && checkDomain(d(domain), d(cookie.domain), cookie.hostOnly) && checksuffix(cookie.domain)){
                if(cookie.sameSite != 'no_restriction' || cookie.secure){
                    if(!cookie.secure || protocol == 'https:'){
                        if(!js || !cookie.httpOnly){
                            let n = account.cookies.findIndex(c => c.name == cookie.name && c.domain == cookie.domain && c.path == cookie.path);
                            if(n < 0){
                                n = account.cookies.length;
                            }
                            account.cookies[n] = cookie;
                            account.cookies = account.cookies.filter(cookie => cookie.session || cookie.expirationDate > date);
                            account.cookies.sort((a, b) => b.path.length - a.path.length);
                            chrome.storage.local.set({accounts});
                            return cookie;
                        }
                    }
                }
            }
            return false;
        }
    };
	let accounts = {}, ids = {}, tabs = {}, urls = ['steamcommunity.com', '.steampowered.com', 'steam.tv'], requestIds = {};
	create_tabs = (id, url = `https://${urls[0]}/my/`, cb = () => null) => chrome.tabs.create({url, active: true}, tab => {
		tabs[tab.id] = {'0': {id}};
		cb(tab);
	}),
	hrefCheck = (href) => {
	    try{
	        let url = new URL(href),
	        host = href.match(/^https?:\/\/([^(\/+|:|\?|$)]+)/)[1];
	        if(/^https?:$/.test(url.protocol) && !/(-(\.|$)|((^|\.)-))/.test(url.hostname) && /^([a-z0-9-]{2,63}\.)+[a-z0-9-]{2,63}$/.test(url.hostname) && !/(-(\.|$)|((^|\.)-))/.test(url.hostname) && /^([^\.]{2,63}\.)+[^.]{2,63}$/.test(host) && !/(-(\.|$)|((^|\.)-))/.test(host) && url.hostname.length < 256){
	            return true;
	        }else{
	            return false;
	        }
	    }catch(err){
	        return false;
	    }
	},
	addhref = (href, n, id) => {
	    if(hrefCheck(href)){
	        let url = new URL(href),
	        account = accounts[id];
	        account.urls = account.urls.filter(url => url.href != href && url.n != n);
	        account.urls.push({href, hostname: url.hostname, n});
	        chrome.storage.local.set({accounts});
	        return true;
	    }else{
	        return false;
	    }
	};

	let SteamID = (id) => id.length == 17 ? String(id.substr(4) - 1197960265728) : '7656' + (Number(id) + 1197960265728);

	let activeTab;

	function authorization(id, cb, account = accounts[id]){
		function getrsakey(code = ''){
			req('post', `https://${urls[0]}/login/getrsakey/`, {
	            donotcache: new Date().getTime(),
	            username: account.login
			}, {[`${chrome.runtime.id}_id`]: id}).done(data => {
				if(data && data.success){
	                req('post', `https://${urls[0]}/login/dologin/`, {
	                    donotcache: new Date().getTime(),
	                    password: RSA.encrypt(account.password, RSA.getPublicKey(data.publickey_mod, data.publickey_exp)),
	                    username: account.login,
	                    twofactorcode: code,
	                    captchagid: -1,
	                    rsatimestamp: data.timestamp,
	                    remember_login: true
	                }, {[`${chrome.runtime.id}_id`]: id}).done(data => {
	                	if(data){
	                		if(data.success){
	                			localStorage.dialog_heading = localStorage.dialog_content = localStorage.dialog_button = localStorage.dialog_twofa = localStorage.dialog_LoadingWrapper = '';
	                			let steamid = data.transfer_parameters.steamid, accountid = SteamID(steamid);
	                			accounts[id] = Object.assign(account, {steamid, accountid});
	                			ids[accountid] = id;
	                			chrome.storage.local.set({accounts, ids});
	                			cb({success: true});
	                			for(let url of data.transfer_urls){
	                                req('post', url, {...data.transfer_parameters, remember_login: true}, {[`${chrome.runtime.id}_id`]: id});
	                            }
	                            update_profile(id, data => chrome.runtime.sendMessage({type: 'refresh', id: account.accountid, data}));
	                		}else{
	                			let message = data.requires_twofactor ? 'Enter twofactor code:' : data.emailauth_needed ? `Enter the code from the mail: ${data.emaildomain}` : data.clear_password_field ? data.message : 'Undefined error';
		            		    if(data.requires_twofactor || data.emailauth_needed){
							    	localStorage.dialog_content = `Authorization on the account <span>${account.login}</span><br>${message}`;
							    	localStorage.dialog_button = '<div class="accept">Accept</div><div class="cancel">Cancel</div>';
							    }else{
							    	localStorage.dialog_content = `Authorization on the account <span>${account.login}</span><br><span style="color: red;">${message}</span>`;
							    	localStorage.dialog_button = '<div class="accept">Try again</div><div class="cancel">Cancel</div>';
							    	localStorage.dialog_twofa = '';
							    	localStorage.dialog_LoadingWrapper = '';
							    }
								chrome.extension.onMessage.addListener(function authCode(message){
									if(message.type == 'authCode' || message.type == 'add_acc' || message.type == 'edit_acc'){
										chrome.extension.onMessage.removeListener(authCode);
									}
								    if(message.type == 'authCode'){
								    	if(message.authCode){
								    		getrsakey(message.authCode);
								    	}else if(account.shared_secret){
								    		genAuthCode(account.shared_secret).then(code => getrsakey(code));
								    	}else{
								    		getrsakey('');
								    	}
								    }
								});
								cb({success: false, message, type: data.requires_twofactor ? 2 : data.emailauth_needed ? 1 : 0});
	                		}
	                	}else{
	                		cb({success: false, message: 'Undefined error'});
	                	}
	                }).fail(data => cb({success: false, message: 'Undefined error'}));
				}else{
					cb({success: false, message: 'Undefined error'});
				}
			}).fail(data => cb({success: false, message: 'Undefined error'}));
		};
		account.cookies = account.cookies.filter(cookie => !(cookie.domain == 'steamcommunity.com' && cookie.name == `steamMachineAuth${account.steamid}`));
		if(account.shared_secret){
			genAuthCode(account.shared_secret).then(code => getrsakey(code));
		}else{
			getrsakey();
		}
	};

	async function addAccount(details, cb){
		let id = await sha1(details.account_name.toLowerCase());
		if(accounts[id] && ids[accounts[id].accountid]){
			return cb({success: false, message: 'has already'});
		}else{
			let account = accounts[id] = {
				login: details.account_name.toLowerCase(),
				password: details.password,
				shared_secret: details.shared_secret || null,
				identity_secret: details.identity_secret || null,
				device_id: details.device_id || null,
				urls: [],
				cookies: [],
				storage: {local: {}, session: {}}
			};
			authorization(id, details => {
				if(details.success){
					accounts[id] = account;
				}
				cb(details);
			}, account);
		}
	};

	function editAccount(id, details, cb){
		if(accounts[id]){
			let account = Object.assign({}, accounts[id]),
			auth_needed = (details.password && account.password != details.password) || (details.shared_secret && account.shared_secret != details.shared_secret);
			for(let key of ['shared_secret', 'identity_secret', 'device_id']){
				if(key in details){
					account[key] = details[key] || null;
				}
			}
			account.password = details.password || account.password;
			account.cookies = accounts[id].cookies;
			account.storage = accounts[id].storage;
			if(auth_needed){
				authorization(id, details => {
					if(details.success){
						accounts[id] = account;
					}
					cb(details);
				}, account);
			}else{
				accounts[id] = account;
				chrome.storage.local.set({accounts});
				cb({success: true});
			}
		}else{
			cb({success: false, message: 'Undefined error'});
		}
	};

	function logged_in(id, cb){
		if(accounts[id]){
			req('get', `https://${urls[0]}/chat/clientjstoken`, null, {[`${chrome.runtime.id}_id`]: id}).always(data => cb(data ? data.logged_in && data.account_name == accounts[id].login : false));
		}else{
			cb(false);
		}
	};

	function update_profile(id, cb = () => null){
		if(accounts[id]){
		    req('get', `https://${urls[0]}/miniprofile/${accounts[id].accountid}/json`, null, {[`${chrome.runtime.id}_id`]: id}).done(data => {
		        if(data && data.avatar_url){
		        	let account = accounts[id];
		        	cb({
		        		avatar: account.avatar = data.avatar_url.split('/').slice(6).join('/'),
		        		frame: account.frame = data.avatar_frame && data.avatar_frame.split('/').slice(6).join('/'),
		        		level: account.level = data.level,
		        		name: account.name = data.persona_name,
		        		video: account.video = data.profile_background && (data.profile_background['video/webm'] || data.profile_background['video/mp4']).split('/').slice(6).join('/')
		        	});
		        	chrome.storage.local.set({accounts});
		        }else{
		        	cb(null);
		        }
		    }).fail(data => cb(null));
		}else{
			cb(null);
		}
	};

	chrome.storage.local.get(['accounts', 'ids'], result => {
		let date = Math.trunc(Date.now() / 1000);
		ids = result.ids || ids;
		for(let id in result.accounts){
			if(ids[result.accounts[id].accountid]){
				accounts[id] = result.accounts[id];
				accounts[id].storage.session = {};
				accounts[id].cookies = accounts[id].cookies.filter(cookie => cookie.session || cookie.expirationDate > date);
			}
		}
	});

	chrome.tabs.onActivated.addListener(tab => activeTab = tab.tabId);

	chrome.tabs.onCreated.addListener(tab => {
		let tabId = tab.openerTabId || activeTab;
		if(tabs[tabId] && (tab.status != 'loading' || !tab.selected)){
			tabs[tab.id] = {'0': {id: tabs[tabId][0].id}};
		}
	});

	chrome.tabs.onRemoved.addListener(tabId => {
		if(tabs[tabId]){
			delete tabs[tabId];
		}
	});

	chrome.webRequest.onBeforeSendHeaders.addListener(details => {
	    if(details.initiator == `chrome-extension://${chrome.runtime.id}`){
	        let id = details.requestHeaders.find(header => header.name == `${chrome.runtime.id}_id`);
	        if(id){
	        	requestIds[details.requestId] = id.value;
	        }
	        details.requestHeaders = details.requestHeaders.filter(header => !new RegExp(`^${chrome.runtime.id}_[a-z]+$`).test(header.name));
	    }
		let url = new URL(details.url),
	    host = url.hostname,
	    tab = tabs[details.tabId],
	    id = requestIds[details.requestId];
		if((id || tab) && /^https?:$/.test(url.protocol) && [...accounts[id || tab[0].id].urls.map(url => url.hostname), ...urls].some(url => checkDomain(d(host), d(url)))){
	        let index = details.requestHeaders.findIndex(header => /^cookie$/i.test(header.name));
	        if(index < 0){
	            index = details.requestHeaders.length;
	            details.requestHeaders[index] = {name: 'Cookie', value: ''};
	        }
	        details.requestHeaders[index].value = cookies.getAll(requestIds[details.requestId] || tab[0].id, url.hostname, url.pathname, url.protocol, false, details.method, details.type, details.initiator).map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
	        return {requestHeaders: details.requestHeaders};
		}
	}, {urls: []}, ['blocking', 'extraHeaders', 'requestHeaders']);

	chrome.webRequest.onHeadersReceived.addListener(details => {
		let url = new URL(details.url),
	    host = url.hostname,
	    tab = tabs[details.tabId];
	    if(tab && /^(main_frame|sub_frame)$/.test(details.type)){
	        tab[details.frameId] = {
	            id: tab[0].id,
	            hostname: host,
	            protocol: url.protocol,
	            origin: url.origin,
	            pathname: url.pathname,
	            method: details.method,
	            type: details.type,
	            initiator: details.initiator
	        };
	    }
	    let id = requestIds[details.requestId];
	    if(id){
	    	delete requestIds[details.requestId];
	    }
		if((id || tab) && /^https?:$/.test(url.protocol) && [...accounts[id || tab[0].id].urls.map(url => url.hostname), ...urls].some(url => checkDomain(d(host), d(url)))){
			for(let header of details.responseHeaders){
			    if(/^set-cookie$/i.test(header.name)){
			        cookies.set(id || tab[0].id, false, url.protocol, url.hostname, url.pathname, header.value);
			    }
			}
			return {responseHeaders: details.responseHeaders.filter(header => !/^set-cookie$/i.test(header.name))};
		}
	}, {urls: []}, ['blocking', 'extraHeaders', 'responseHeaders']);

	chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
		if(sender.origin != `chrome-extension://${chrome.runtime.id}` && sender.tab && sender.tab.id){
			let tab = tabs[sender.tab.id];
			if(tab && (tab = tab[sender.frameId])){
				let url = new URL(sender.tab.url),
				account = accounts[tab.id];
		        hostname = url.hostname,
		        origin = url.origin,
		        suffix = [hostname];
				if(message == 'onCompleted'){
		            for(let i = 1; i <= hostname.match(/\./g).length; i++){
						suffix.push(suffix[i - 1].replace(/^[^\.]*\./, ''));
		            }
		            suffix = suffix.filter(suffix => checksuffix(suffix));
		            tab.origin = origin;
		            tab.protocol = url.protocol;
		            tab.pathname = url.pathname;
		            tab.hostname = url.hostname;
		            let storage = account.storage;
			    	sendResponse({
			            localStorage: storage.local[origin] || {},
			            sessionStorage: storage.session[origin] || {},
			            suffix: suffix,
			            cookies: cookies.getAll(tab.id, tab.hostname, tab.pathname, tab.protocol, true, tab.method, tab.type, tab.initiator)
			        });
			    }
			    if(/^(localStorage|sessionStorage)$/.test(message.type)){
		            let storage = account.storage[message.type == 'localStorage' ? 'local' : 'session'][url.origin];
		            storage = storage ? storage : account.storage[message.type == 'localStorage' ? 'local' : 'session'][url.origin] = {};
		            if(message.event == 'removeItem'){
		                delete storage[message.key];
		            }
		            if(message.event == 'setItem'){
		                storage[message.key] = message.value;
		            }
		            if(message.event == 'clear'){
		                account.storage[message.type == 'localStorage' ? 'local' : 'session'][url.origin] = {};
		            }
		            chrome.storage.local.set({accounts});
					let accountTabIds = [];
					for(let tabId in tabs){
					    for(let frameId in tabs[tabId]){
					        if((sender.tab.id != tabId || sender.frameId != frameId) && tabs[tabId][frameId].id == tab.id && tabs[tabId][frameId].origin == url.origin){
					            accountTabIds.push({tabId: Number(tabId), frameId: Number(frameId)});
					        }
					    }
					}
		            delete message.initiator;
		            for(let tab of accountTabIds){
		                chrome.tabs.sendMessage(tab.tabId, message, {frameId: tab.frameId});
		            }
			    }
		        if(message.type == 'cookies' && message.cookie){
		            let cookie = cookies.set(tab.id, true, tab.protocol, tab.hostname, tab.pathname, message.value);
		            if(cookie){
		                chrome.storage.local.set({accounts});
		                delete message.initiator;
		                let accountTabIds = [];
						for(let tabId in tabs){
						    for(let frameId in tabs[tabId]){
						        if((sender.tab.id != tabId || sender.frameId != frameId) && tabs[tabId][frameId].id == tab.id && tabs[tabId][frameId].hostname && [...account.urls.map(url => url.hostname), ...urls].some(url => checkDomain(d(tabs[tabId][frameId].hostname), d(url))) && checkDomain(d(tabs[tabId][frameId].hostname), d(cookie.domain), cookie.hostOnly) && checkPath(p(tabs[tabId][frameId].pathname), p(cookie.path)) && (!cookie.secure || tabs[tabId][frameId].protocol == 'https:')){
						            accountTabIds.push({tabId: Number(tabId), frameId: Number(frameId)});
						        }
						    }
						}
			            delete message.initiator;
			            for(let tab of accountTabIds){
			                chrome.tabs.sendMessage(tab.tabId, message, {frameId: tab.frameId});
			            }
		            }
		        }
			}else{
				if(message == 'onCompleted'){
					sendResponse(false);
				}
			}
		}else{
	        if(message.type == 'add_acc'){
	            addAccount(message.data, data => {
	            	chrome.runtime.sendMessage({type: 'auth', login: message.data.account_name.toLowerCase(), data});
	            });
	        }
	        if(message.type == 'edit_acc'){
	            sha1(message.data.account_name.toLowerCase()).then(id => editAccount(id, message.data, data => {
	            	chrome.runtime.sendMessage({type: 'auth', login: message.data.account_name.toLowerCase(), data});
	            }));
	        }
	        if(message == 'getTabs'){
	            sendResponse((() => {
	                let tabs = {};
	                for(let id in ids){
	                    tabs[id] = {};
	                    for(let url of accounts[ids[id]].urls){
	                        tabs[id][url.n] = {
	                            link: url.href,
	                            favicon: `chrome://favicon/${new URL(url.href).origin}`
	                        };
	                    }
	                }
	                return tabs;
	            })());
	        }
	        if(message == "getAccs"){
				sendResponse(Object.keys(ids).map(id => ({
				    avatar: accounts[ids[id]].avatar,
				    frame: accounts[ids[id]].frame,
				    id,
				    login: accounts[ids[id]].login,
				    lvl: accounts[ids[id]].level,
				    name: accounts[ids[id]].name,
				    secret: {
				    	identity: accounts[ids[id]].identity_secret ? true : false,
				    	shared: accounts[ids[id]].shared_secret ? true : false
				    },
				    video: accounts[ids[id]].video
				})));
	        }
	        if(message == 'getUsers'){
	        	
	        }
	        if(message.type == 'addHref'){
	            sendResponse(addhref(message.href, message.n, ids[message.id]));
	        }
	        if(message.type == 'removeHref'){
	            let account = accounts[ids[message.id]];
	            account.urls = account.urls.filter(url => url.n != message.n);
	            chrome.storage.local.set({accounts});
	        }
	        if(message.type == 'go_over'){
	        	let id = ids[message.id];
	        	create_tabs(id, message.link || `https://${urls[0]}/my/`, tab => {
	        		if(!message.link){
		        		logged_in(id, logged_in => {
		        			if(!logged_in && accounts[id] && accounts[id].shared_secret){
		        				authorization(id, result => {
		        					chrome.tabs.reload(tab.id);
		        				});
		        			}
		        		});
	        		}
	        	});
	        }
	        if(message.type == 'switch'){
	        	let id = ids[message.id];
	        	cookies.switch(id, () => {
		        	logged_in(id, logged_in => {
		        		if(!logged_in){
		        			if(accounts[id] && accounts[id].shared_secret){
			        			authorization(id, result => {
			        				if(result.success){
			        					cookies.switch(id);
			        					chrome.runtime.sendMessage({type: 'active', id: message.id});
			        				}
			        			});
		        			}
		        		}else{
		        			chrome.runtime.sendMessage({type: 'active', id: message.id});
		        		}
		        	});
	        	});
	        }
	        if(message.type == 'del_acc'){
	        	let id = ids[message.id];
	        	delete accounts[id];
	        	delete ids[message.id];
	        	chrome.storage.local.set({accounts, ids});
	        }
	        if(message.type == 'clear_data'){
	        	let id = ids[message.id],
	        	account = accounts[id];
	        	account.cookies = [];
	        	account.storage = {local: {}, session: {}};
	        	chrome.storage.local.set({accounts});
	        }
	        if(message.type == 'refresh'){
	        	let id = ids[message.id];
	        	update_profile(id, data => chrome.runtime.sendMessage({type: 'refresh', id: message.id, data}));
	        }
	        if(message.type == 're_auth'){
	        	let id = ids[message.id];
	        	authorization(id, data => {
					chrome.runtime.sendMessage({type: 'auth', login: accounts[id].login, data});
	        	});
	        }
	        if(message.type == 'confirm'){
	        	mobileconf(ids[message.id]);
	        }
	        if(message.type == 'getCode'){
	        	genAuthCode(accounts[ids[message.id]].shared_secret).then(code => chrome.runtime.sendMessage({type: 'twofactorcode', code}));
	        }
	        if(message.type == 'clean_db'){
	            let account = accounts[ids[message.id]],
	            url = new URL(account.urls.find(url => url.n == message.n).href),
	            host = url.hostname;
	            delete account.storage.local[url.origin];
	            delete account.storage.session[url.origin];
	            account.cookies = account.cookies.filter(cookie => !checkDomain(d(host), d(cookie.domain), cookie.hostOnly));
				for(let tabId in tabs){
				    for(let frameId in tabs[tabId]){
				    	let tab = tabs[tabId][frameId];
				        if(tab.origin == url.origin){
					        chrome.tabs.sendMessage(Number(tabId), {type: 'localStorage', event: 'clear'}, {frameId: Number(frameId)});
					        chrome.tabs.sendMessage(Number(tabId), {type: 'localStorage', event: 'clear'}, {frameId: Number(frameId)});
				        }
				        if(tab.hostname && checkDomain(d(tab.hostname), d(host))){
				        	chrome.tabs.sendMessage(Number(tabId), {
				        		type: 'cookies',
				        		event: 'setItems',
				        		cookies: cookies.getAll(tab.id, tab.hostname, tab.pathname, tab.protocol, true, tab.method, tab.type, tab.initiator)
				        	}, {frameId: Number(frameId)});
				        }
				    }
				}
	        }
		}
	});
})();