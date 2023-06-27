(() => {
	let mobile_innerHTML = `<html class="responsive">
		<head>
			<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
			<meta name="viewport" content="width=device-width,initial-scale=1">
			<meta name="theme-color" content="#171a21">
			<title></title>
			<link href="mobileconf/css/motiva_sans.css" rel="stylesheet" type="text/css">
			<link href="mobileconf/css/buttons.css" rel="stylesheet" type="text/css">
			<link href="mobileconf/css/shared_global.css" rel="stylesheet" type="text/css">
			<link href="mobileconf/css/globalv2.css" rel="stylesheet" type="text/css">
			<link href="mobileconf/css/modalContent.css" rel="stylesheet" type="text/css">
			<link href="mobileconf/css/styles_mobileconf.css" rel="stylesheet" type="text/css">
			<link href="mobileconf/css/motiva_sans.css" rel="stylesheet" type="text/css">
			<link href="mobileconf/css/html5.css" rel="stylesheet" type="text/css">
			<link href="mobileconf/css/economy.css" rel="stylesheet" type="text/css">
			<link href="mobileconf/css/trade.css" rel="stylesheet" type="text/css">
			<link href="mobileconf/css/profile_tradeoffers.css" rel="stylesheet" type="text/css">
			<link href="mobileconf/css/shared_responsive.css" rel="stylesheet" type="text/css">
			<link href="mobileconf/css/header.css" rel="stylesheet" type="text/css">
		</head>
		<body class=" responsive_page">
			<div class="responsive_page_frame with_header">
				<div class="responsive_local_menu_tab"></div>
				<div class="responsive_header" style="display: block;">
					<div class="responsive_header_content">
						<div class="responsive_header_logo"></div>
					</div>
				</div>
				<div class="responsive_page_content_overlay"></div>
				<div class="responsive_fixonscroll_ctn nonresponsive_hidden "></div>
				<div class="responsive_page_content">
					<div class="responsive_page_template_content">
						<div id="mobileconf_empty" class="mobileconf_done mobileconf_header">
							<div>Nothing to confirm</div>
							<div>There is nothing to confirm at the moment.</div>
						</div>
						<div id="mobileconf_done" class="mobileconf_done mobileconf_header" style="display: none">
							<div>Done</div>
							<div>Everything is ready, there is no need to confirm anything else.</div>
						</div>
						<div id="mobileconf_details" style="display: none;">
						</div>
						<div id="mobileconf_buttons" style="display: none;">
							<div>
								<div class="mobileconf_button mobileconf_button_cancel"></div>
								<div class="mobileconf_button mobileconf_button_accept"></div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</body>
	</html>`;

	let OffsetTime = 0;

	function getTime(){
		return (Date.now() / 1000) + (OffsetTime || 0);
	};

	function getOffsetTime(){
		req('post', 'https://api.steampowered.com//ITwoFactorService/QueryTime/v1/').done(data => {
			if('server_time' in data?.response){
				OffsetTime =  data.response.server_time - getTime();
			}
		});
	};
	getOffsetTime();

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
	  let time = getTime();
	  return `p=${device_id}&a=${steamid}&k=${await genConfKey(identity_secret, time, tag)}&t=${time}&m=android&tag=${tag}`;
	};

	async function sha1(str){
	  return await subtle.digest({name: "SHA-1"}, new Uint8Array(str.match(/.{1}/g).map(s => s.charCodeAt()))).then(result => [...new Uint8Array(result)].map(n => n.toString(16)).join(''));
	};

	async function deviceId(id){
	  return await sha1(id).then(result => result.replace(/^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12}).*$/, 'android:$1-$2-$3-$4-$5'));
	};
	let confTabs = {};
	function timeSince(creation_time){
		let time = Date.now() / 1000 - creation_time;
		return time > 60 ? time > 3600 ? time > 86400 ? `${Math.trunc(time / 86400)} day ago` : `${Math.trunc(time / 3600)} hour ago` : `${Math.trunc(time / 60)} minute ago` : 'Just now';
	};
	async function mobileconf(id){
		let error_count = 0;
		let account = accounts[id];
		if(!(confTabs[id] && !confTabs[id].closed)){
			let httpParams = (tag = 'conf') => genConfParams(account.identity_secret, account.device_id, account.steamid, tag),
			conf_progress = false;
			account.ConfLink = account.ConfLink || `https://steamcommunity.com/mobileconf/getlist?${await httpParams('list')}`;
			let tab = window.open('\mobileconf.html', id, 'height=768,width=512,resize=yes,scrollbars=yes');
			confTabs[id] = tab;
			tab.document.title = `${account.login} :: Mobile confirmation`;
			async function refresh(){
				if(!account.ConfLink){
					account.ConfLink = `https://steamcommunity.com/mobileconf/getlist?${await httpParams('list')}`;
				}
				req('get', account.ConfLink, null, {[`${chrome.runtime.id}_id`]: id}).done(async data => {
					let mobileconf = tab.document.createElement('html');
					mobileconf.innerHTML = mobile_innerHTML;
	                if(!data.success && !data.needauth){
						getOffsetTime();
						account.ConfLink = null;
						if(data.message && data.detail){
							mobileconf.querySelector('#mobileconf_empty').innerHTML = `<div>${data.message}</div>
							<div>${data.detail}</div>`;
						}else{
							mobileconf.querySelector('#mobileconf_empty').innerHTML = `<div>Invalid authenticator</div>
							<div>It looks like your Steam Guard Mobile Authenticator is providing incorrect Steam Guard codes. This could be caused by an inaccurate clock or bad timezone settings on your device. If your time settings are correct, it could be that a different device has been set up to provide the Steam Guard codes for your account, which means the authenticator on this device is no longer valid.</div>`;
						}
					}
					let mobileconf_list = tab.document.createElement('div');
					mobileconf_list.id = 'mobileconf_list';
					tab.login = account.login;
					if(data.conf?.length){
						for(let item of data.conf){
							if(item.type == 2){
								mobileconf_list.insertAdjacentHTML('afterbegin', `<div class="mobileconf_list_entry" id="conf${item.id}" data-confid="${item.id}" data-key="${item.nonce}" data-type="${item.type}" data-creator="${item.creator_id}" data-cancel="${item.cancel}" data-accept="${item.accept}">
									<div class="mobileconf_list_entry_content">
										<div class="mobileconf_list_entry_icon">
											<div style="border: 1px solid transparent;border-color: #D2D2D2;"><img src="${item.icon}" style="width: 32px;"></div>
										</div>
										<div class="mobileconf_list_entry_description">
											<div>${item.type_name} - ${timeSince(item.creation_time)}</div>
											<div>${item.headline}</div>
											<div>${item.summary.join('</div><div>')}</div>${item.warn ? `div style="color: #a9842e;">${item.warn}</div>` : ''}
										</div>
									</div>
									<div class="mobileconf_list_entry_sep"></div>
								</div>`);
							}
							if(item.type == 3){
								mobileconf_list.insertAdjacentHTML('afterbegin', `<div class="mobileconf_list_entry" id="conf${item.id}" data-confid="${item.id}" data-key="${item.nonce}" data-type="${item.type}" data-creator="${item.creator_id}" data-cancel="${item.cancel}" data-accept="${item.accept}">
									<div class="mobileconf_list_entry_content">
										<div class="mobileconf_list_entry_icon">
											<div style="border: 1px solid transparent;border-color: #D2D2D2;"><img src="${item.icon}" style="width: 32px;"></div>
										</div>
										<div class="mobileconf_list_checkbox">
											<input id="multiconf_${item.id}" data-confid="${item.id}" data-key="${item.nonce}" value="1" type="checkbox">
										</div>
										<div class="mobileconf_list_entry_description">
											<div>${item.type_name} - ${item.summary.join(' ')}</div>
											<div>${item.headline}</div>
											<div>${timeSince(item.creation_time)}</div>${item.warn ? `div style="color: #ffcc6a;">${item.warn}</div>` : ''}
										</div>
									</div>
									<div class="mobileconf_list_entry_sep"></div>
								</div>`);
							}
						}
						mobileconf.querySelector('#mobileconf_empty').remove();
						mobileconf.querySelector('.responsive_page_template_content').prepend(mobileconf_list);
					}
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
					        script.src = `/mobileconf/scripts/${src.shift()}.js`;
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
						addScripts(['mobileconf'], () => {
	                        tab.g_bClickInProgress = false;
	                        tab.history.replaceState('', '', '/mobileconf');
						});
					}else{
						tab.document.querySelector('html').innerHTML = mobileconf.outerHTML;
						addScripts(['XMLHttpRequest', 'script 1', 'prototype-1.7', 'script 2', '_combined', 'global', 'jquery-1.11.1.min', 'tooltip', 'shared_global', 'CDelayedAJAXData', 'script 3', 'jquery-ui-1.9.2.min', 'mobileconf', 'economy_common', 'economy', 'modalv2', 'modalContent', 'shared_responsive_adapter', 'script 4', 'script 5'],
							() => {
								conf_progress = true;
								tab.getOffsetTime = () => getOffsetTime();
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
				}).fail(() => {
					account.ConfLink = null;
					if(++error_count < 3) refresh();
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
            expirationDate = expires != null ? expires : max_age;
            session = expirationDate == null;

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
	create_tabs = (id, url = `https://${urls[0]}/my/`, active = true, cb = () => null) => chrome.tabs.create({url, active: active}, tab => {
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

	function settoken(id, url, params, cb){
		req('post', url, params , {[`${chrome.runtime.id}_id`]: id}).always(data => {
			cb(data?.result == 1);
		});
	};

	function ajaxrefresh(id, redir, cb)	{
		req('post', 'https://login.steampowered.com/jwt/ajaxrefresh', {
			redir
		}, {[`${chrome.runtime.id}_id`]: id}).always(data => {
			if(data?.success){
				settoken(id, data.login_url, {auth: data.auth, nonce: data.nonce, steamID: data.steamID}, cb);
			}else{
				cb(false);
			}
		});
	};

	function authorization(id, cb, account = accounts[id], code){
		let client_id, request_id, steamid, weak_token, confirmation_type, Timeout,
		BeginAuthSessionViaCredentials_done = false,
		website_id = 'Community',
		device_friendly_name = navigator.userAgent,
		platform_type = 2,
		sessionid = cookies.get(id, 'steamcommunity.com', 'sessionid')?.value || Array(24).fill('').map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),
		device_details = JSON.stringify({device_friendly_name, platform_type});
		
		let onFail = () => {
			chrome.extension.onMessage.addListener(function authCode(message){
				if(/^(cancel|getCode|authCode|add_acc|edit_acc)$/.test(message.type)){
					chrome.extension.onMessage.removeListener(authCode);
					if(message.type == 'authCode'){
						authorization(id, cb, account);
					}
					clearTimeout(Timeout);
					confirmation_type = 0;
				}
			});
		};
	
		let PollAuthSessionStatus = () => {
			req('post', 'https://api.steampowered.com/IAuthenticationService/PollAuthSessionStatus/v1', {
				client_id,
				request_id
			}, {[`${chrome.runtime.id}_id`]: id}).done(data => {
				if('refresh_token' in data?.response){
					req('post', 'https://login.steampowered.com/jwt/finalizelogin', {
						nonce: data.response.refresh_token,
						sessionid,
						redir: 'https://steamcommunity.com/login/home/?goto=login'
					}, {[`${chrome.runtime.id}_id`]: id}).done(data => {
						if('transfer_info' in data){
							let count = 0,
							length = data.transfer_info.length,
							redir = [];
							function check(success){
								if(success){
									localStorage.dialog_heading = localStorage.dialog_content = localStorage.dialog_button = localStorage.dialog_twofa = localStorage.dialog_LoadingWrapper = '';
									let accountid = SteamID(steamid);
									accounts[id] = Object.assign(account, {steamid, accountid});
									ids[accountid] = id;
									chrome.storage.local.set({accounts, ids});
									cb({success: true});
									update_profile(id, data => chrome.runtime.sendMessage({type: 'refresh', id: account.accountid, data}));
								}else{
									onFail();
									clearTimeout(Timeout);
									cb({success: false, message: 'Undefined error'});
								}
							};
							for(let item of data.transfer_info){
								settoken(id, item.url, {...item.params, steamID: data.steamID}, response => {
									if(!response && !/https:\/\/checkout\./.test(item.url)){
										redir.push(item.url.replace(/login\/settoken$/, ''));
									}
									if(++count == length){
										if(!redir.length){
											check(true);
										}else{
											let count = 0,
											length = redir.length,
											success = true;
											for(let url of redir){
												ajaxrefresh(id, url, response => {
													success = success && response;
													if(++count == length){
														check(success);
													}
												});
											}
										}
									}
								});
							}
						}
					});
					return;
				}
				if(BeginAuthSessionViaCredentials_done && !steamid){
					return cb({success: false, message: 'Undefined error'});
				}
				client_id = data?.response?.new_client_id || client_id;
				if(!BeginAuthSessionViaCredentials_done || confirmation_type == 2 || confirmation_type == 3){
					Timeout = setTimeout(PollAuthSessionStatus, 5000);
				}
			});
		};
		let UpdateAuthSessionWithSteamGuardCode = (code, code_type) => {
			req('post', 'https://api.steampowered.com/IAuthenticationService/UpdateAuthSessionWithSteamGuardCode/v1', {
				client_id,
				steamid,
				code,
				code_type
			}, {[`${chrome.runtime.id}_id`]: id}).fail(() => {
				onFail();
				clearTimeout(Timeout);
				cb({success: false, message: 'Undefined error'});
			})
		};
		let BeginAuthSessionViaCredentials = data => {
			let encrypted_password = RSA.encrypt(account.password, RSA.getPublicKey(data.response.publickey_mod, data.response.publickey_exp));
			req('post', 'https://api.steampowered.com/IAuthenticationService/BeginAuthSessionViaCredentials/v1', {
				account_name: account.login,
				encrypted_password,
				encryption_timestamp: data.response.timestamp,
				remember_login: true,
				website_id,
				device_friendly_name,
				platform_type,
				device_details,
				language: 1,
				persistence: 1,
				qos_level: 2,
			}, {[`${chrome.runtime.id}_id`]: id}).done(data => {
				BeginAuthSessionViaCredentials_done = true;
				steamid = data?.response?.steamid;
				client_id = data?.response?.client_id;
				request_id = data?.response?.request_id;
				weak_token = data?.response?.weak_token;
				confirmation_type = data?.response?.allowed_confirmations?.[0]?.confirmation_type;
				if(steamid && client_id && request_id){
					if(confirmation_type == 3 && (account.shared_secret || code)){
						if(code){
							UpdateAuthSessionWithSteamGuardCode(code, confirmation_type);
						}else{
							genAuthCode(account.shared_secret).then(code => UpdateAuthSessionWithSteamGuardCode(code, confirmation_type));
						}
					}else{
						let message = confirmation_type == 3 ? 'Enter twofactor code:' : confirmation_type == 2 ? `Enter the code from the mail: ${data.response.allowed_confirmations[0].associated_message}` : data.response.extended_error_message || 'Undefined error';
						if(confirmation_type == 2 || confirmation_type == 3){
							localStorage.dialog_content = `Authorization on the account <span>${account.login}</span><br>${message}`;
							localStorage.dialog_button = '<div class="accept">Accept</div><div class="cancel">Cancel</div>';
						}else{
							localStorage.dialog_content = `Authorization on the account <span>${account.login}</span><br><span style="color: red;">${message}</span>`;
							localStorage.dialog_button = '<div class="accept">Try again</div><div class="cancel">Cancel</div>';
							localStorage.dialog_twofa = '';
							localStorage.dialog_LoadingWrapper = '';
						}
						chrome.extension.onMessage.addListener(function authCode(message){
							if(/^(cancel|getCode|authCode|add_acc|edit_acc)$/.test(message.type)){
								chrome.extension.onMessage.removeListener(authCode);
								if(message.type == 'authCode'){
									if(message.authCode){
										UpdateAuthSessionWithSteamGuardCode(message.authCode, confirmation_type);
									}else if(confirmation_type == 3 && account.shared_secret){
										genAuthCode(account.shared_secret).then(code => UpdateAuthSessionWithSteamGuardCode(code, confirmation_type));
									}else{
										clearTimeout(Timeout);
										authorization(id, cb, account);
									}
								}else{
									clearTimeout(Timeout);
									confirmation_type = 0;
								}
							}
						});
						cb({success: false, message, type: confirmation_type == 3 ? 2 : confirmation_type == 2 ? 1 : 0});
					}
				}else{
					onFail();
					clearTimeout(Timeout);
					cb({success: false, message: 'Undefined error'});
				}
			}).fail(() => {
				onFail();
				clearTimeout(Timeout);
				cb({success: false, message: 'Undefined error'});
			});
		};
		let GetPasswordRSAPublicKey = () => {
			Timeout = setTimeout(PollAuthSessionStatus, 5000);
			req('get', `https://api.steampowered.com/IAuthenticationService/GetPasswordRSAPublicKey/v1?account_name=${account.login}`, null, {[`${chrome.runtime.id}_id`]: id}).done(data => {
				BeginAuthSessionViaCredentials(data);
			}).fail(() => {
				onFail();
				clearTimeout(Timeout);
				cb({success: false, message: 'Undefined error'});
			});
		};

		req('post', 'https://api.steampowered.com/IAuthenticationService/BeginAuthSessionViaQR/v1', {
			device_friendly_name,
			platform_type,
			website_id,
			device_details
		}, {[`${chrome.runtime.id}_id`]: id}).done(data => {
			client_id = data?.response?.client_id;
			request_id = data?.response?.request_id;
			if(client_id && client_id){
				GetPasswordRSAPublicKey();
			}else{
				onFail();
				clearTimeout(Timeout);
				cb({success: false, message: 'Undefined error'});
			}
		}).fail(() => {
			onFail();
			cb({success: false, message: 'Undefined error'});
		});
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
			}, account, details.twofacode);
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
				}, account, details.twofacode);
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
		    req('get', `https://${urls[0]}/miniprofile/${accounts[id].accountid}/json?t=${Date.now()}`, null, {[`${chrome.runtime.id}_id`]: id}).done(data => {
		        if(data && data.avatar_url){
		        	let account = accounts[id];
                    cb({
                        avatar: account.avatar = data.avatar_url,
                        frame: account.frame = data.avatar_frame,
                        level: account.level = data.level,
                        name: account.name = data.persona_name,
                        video: account.video = data.profile_background && (data.profile_background['video/webm'] || data.profile_background['video/mp4'])
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
		if((id || tab) && /^https?:$/.test(url.protocol) && accounts[id || tab[0].id]?.urls.map(url => url.hostname).concat(...urls).some(url => checkDomain(d(host), d(url)))){
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
		if((id || tab) && /^https?:$/.test(url.protocol) && accounts[id || tab[0].id]?.urls.map(url => url.hostname).concat(...urls).some(url => checkDomain(d(host), d(url)))){
            let items = details.responseHeaders.filter(header => /^set-cookie$/i.test(header.name)).map(header => cookies.set(id || tab[0].id, false, url.protocol, url.hostname, url.pathname, header.value))
            if(items.length){
                for(let tabId in tabs){
                    for(let frameId in tabs[tabId]){
                        if(details.tabId != tabId || details.frameId != frameId){
                            if(tabs[tabId][frameId].id == (id || tab[0].id) && tabs[tabId][frameId].hostname){
                                let cookie = items.filter(cookie => {
                                    if(checkDomain(d(tabs[tabId][frameId].hostname), d(cookie.domain), cookie.hostOnly)){
                                        if(checkPath(p(tabs[tabId][frameId].pathname), p(cookie.path))){
                                            if(!cookie.httpOnly && (!cookie.secure || tabs[tabId][frameId].protocol == 'https:')){
                                                return true;
                                            }
                                        }
                                    }
                                    return false;
                                });
                                if(cookie.length){
                                    chrome.tabs.sendMessage(Number(tabId), {
                                        type: 'cookies',
                                        event: 'setItems',
                                        items: cookie
                                    }, {frameId: Number(frameId)});
                                }
                            }
                        }
                    }
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
                    if(account.urls.map(url => url.hostname).concat(...urls).some(url => checkDomain(d(hostname), d(url)))){
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
                    }else{
                        sendResponse(null);
                    }
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
                if(message.type == 'cookies' && message.event == 'setItems'){
                    let items = message.items.map(value => cookies.set(tab.id, true, tab.protocol, tab.hostname, tab.pathname, value)).filter(cookie => cookie);
                    if(items.length){
                        for(let tabId in tabs){
                            for(let frameId in tabs[tabId]){
                                if(sender.tab.id != tabId || sender.frameId != frameId){
                                    if(tabs[tabId][frameId].id == tab.id && tabs[tabId][frameId].hostname){
                                        let cookie = items.filter(cookie => {
                                            if(checkDomain(d(tabs[tabId][frameId].hostname), d(cookie.domain), cookie.hostOnly)){
                                                if(checkPath(p(tabs[tabId][frameId].pathname), p(cookie.path))){
                                                    if((!cookie.secure || tabs[tabId][frameId].protocol == 'https:')){
                                                        return true;
                                                    }
                                                }
                                            }
                                            return false;
                                        });
                                        if(cookie.length){
                                            chrome.tabs.sendMessage(Number(tabId), {
                                                type: 'cookies',
                                                event: 'setItems',
                                                items: cookie,
                                                initiator: chrome.runtime.id
                                            }, {frameId: Number(frameId)});
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
			}else{
				if(message == 'onCompleted'){
					sendResponse(null);
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
				    level: accounts[ids[id]].level,
				    name: accounts[ids[id]].name,
                    tabs: accounts[ids[id]].urls.map(tab => tab.n),
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
                accounts[id].urls.sort((a, b) => a.n == message.n ? -1 : b.n == message.n ? 1 : 0);
	        	create_tabs(id, message.link || `https://${urls[0]}/my/`, message.active, tab => {
	        		if(!message.link){
		        		logged_in(id, logged_in => {
							if(!logged_in && accounts[id]){
								ajaxrefresh(id, `https://${urls[0]}/my/`, success => {
									if(!success){
										if(accounts[id].shared_secret){
											authorization(id, result => {
												chrome.tabs.reload(tab.id);
											});
										}
									}
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
                chrome.storage.local.set({accounts});
				for(let tabId in tabs){
				    for(let frameId in tabs[tabId]){
                        if(tabs[tabId][frameId].id == ids[message.id]){
    				    	let tab = tabs[tabId][frameId];
    				        if(tab.origin == url.origin){
    					        chrome.tabs.sendMessage(Number(tabId), {type: 'localStorage', event: 'clear'}, {frameId: Number(frameId)});
    					        chrome.tabs.sendMessage(Number(tabId), {type: 'sessionStorage', event: 'clear'}, {frameId: Number(frameId)});
    				        }
    				        if(tab.hostname && checkDomain(d(tab.hostname), d(host))){
    				        	chrome.tabs.sendMessage(Number(tabId), {
    				        		type: 'cookies',
    				        		event: 'clear',
    				        		host
    				        	}, {frameId: Number(frameId)});
    				        }
                        }
				    }
				}
	        }
		}
	});
})();