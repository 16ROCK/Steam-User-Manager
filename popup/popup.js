(() => {
	let active = {}, accs = [], tabs, selected, codeTim, codeInt, lineInt;

	function hrefCheck(href){
	    try{
	        let url = new URL(href),
	        host = href.match(/^https?:\/\/([^(\/+|:|\?|$)]+)/)[1];
	        if(/^https?:$/.test(url.protocol) && !/(-(\.|$)|((^|\.)-))/.test(url.hostname) && /^([a-z0-9-]{2,63}\.)+[a-z0-9-]{2,63}$/.test(url.hostname) && !/(-(\.|$)|((^|\.)-))/.test(url.hostname) && /^([^\.]{2,63}\.)+[^.]{2,63}$/.test(host) && !/(-(\.|$)|((^|\.)-))/.test(host) && url.hostname.length < 256){
	            return true;
	        }else{
	            return false;
	        }
	    }catch(err){
	        return hrefCheck(`https://${href}`);
	    }
	};

	let rm_hovers = q('.round_menu>.rm_block>.rm_segment>.rm_hover'),
	rm_info = q('.rm_info'),
	rm_link = q('.rm_link');

	function round_menu(id){
		active.id = id;
		rm_info.class('rm_info');
		rm_hovers.class.remove('active');
		rm_link.class.remove('active').val('').css.text('--max_px: 0px');
		q('.round_menu>.rm_block>.rm_segment>.rm_hover:not([data-type="menu"])').data('type', 'add').data.remove('link').child('.rm_img.favicon').attr.remove('src');
		for(let n in tabs[id]){
			q(`.round_menu>.rm_block>.rm_segment>.rm_hover[data-n="${n}"]`).data('type', 'link').data('link', tabs[id][n].link).child('.rm_img.favicon').attr('src', tabs[id][n].favicon);
		}
		q('.round_menu').class.add('active');
		q('#background').class.add('active').css('opacity', 0.5);
	};

	chrome.runtime.sendMessage('getTabs', response => {
		tabs = response;
	});

	function add_info(){
		rm_info.class('rm_info');
		rm_link.class.remove('active').val('').css.text('--max_px: 0px');
		if(active.data.type == 'link'){
			rm_info.class.add('link');
			rm_link.class.add('active').attr.add('disabled').val(active.data.link).css.text(`--max_px: ${rm_link.offset.width() - rm_link.scroll.width()}px`);
		}
		if(active.data.type == 'add'){
			rm_link.class.add('active').attr.remove('disabled').focus();
		}
	};

	function hover(){
		active.data = active.target.data();
		rm_hovers.class.remove('active');
		active.target.class.add('active');
		add_info();
	};

	q('img.logo').on('click', () => open(chrome.runtime.getURL('/popup/popup.html')));

	rm_hovers.on('mouseenter', function(){
		if(!active.confirm){
			active.target = q(this);
			hover();
		}
	});

	rm_hovers.on('click', function(){
		active.confirm = false;
		active.target = q(this);
		hover();
	});

	q('.rm_hover[data-type="remove_link"], .rm_hover[data-type="clean_db"], .rm_hover[data-type="edit_link"]').on('click', function(){
		active.confirm = true;
		let type = q(this).data('type');
		active.type = type;
		rm_info.class('rm_info').class.add('confirm').class.add(type);
		if(type == 'edit_link'){
			let width = rm_link.offset.width() - rm_link.scroll.width();
			confirm.class.remove('readonly');
			rm_link.class.add('active').attr.remove('disabled').action('setSelectionRange', width, width).css.text('--max_px: 0px').focus();
		}
	});

	q('.rm_hover[data-type="go_over"]').on('mousedown', function(){
		if(event.button < 2){
			chrome.runtime.sendMessage({type: 'go_over', id: active.id, link: active.data.link, n: active.data.n, active: !event.button});
		}
		if(!event.button){
			active.confirm = false;
			q('.users>.user').class.remove('selected');
			q('div#background, .round_menu').class.remove('active');
		}
	});

	rm_link.on('mousedown', () => {
		if(!active.confirm && active.data.type == 'add'){
			active.confirm = true;
			confirm.class.add('readonly');
			active.type = 'add_link';
			rm_info.class('rm_info').class.add('confirm').class.add('add_link');
		}
	});

	q('.rm_hover[data-type="cancel"]').on('click', function(){
		active.confirm = false;
		add_info();
	});

	let confirm = q('.rm_hover[data-type="confirm"]');

	q('.round_menu').on('mouseleave', () => {
		if(!active.confirm){
			rm_link.class.remove('active').val('').css.text('--max_px: 0px');
			rm_info.class('rm_info');
			rm_hovers.class.remove('active');
		}
	});

	rm_link.on('input', function(event){
		active.confirm = true;
		active.type = 'add_link';
		rm_info.class('rm_info').class.add('confirm').class.add('add_link');
		if(hrefCheck(q(this).val())){
			confirm.class.remove('readonly');
		}else{
			confirm.class.add('readonly');
		}
	});

	confirm.on('click', function(){
		if(!confirm.class.has('readonly')){
			let n = active.data.n, id = active.id, acc = accs.find(acc => acc.id == id);
			if(active.type == 'add_link' || active.type == 'edit_link'){
				let href = rm_link.val();
				href = /^https:\/\//i.test(href) ? href : `https://${href}`;
				chrome.runtime.sendMessage({type: 'addHref', n, id, href}, response => {
					if(response){
                        for(let n in tabs[id]){
                            if(tabs[id][n].link == href){
                            	acc.tabs = acc.tabs.filter(tab => tab != n);
                                delete tabs[id][n];
                                break;
                            }
                        }
						tabs[id][n] = {
                            link: href,
                            favicon: `chrome://favicon/${new URL(href).origin}`
						};
						if(!acc.tabs.some(tab => tab == n)){
							acc.tabs.push(n);
						}
						acc.tabs.sort((a, b) => a == n ? 1 : b == n ? -1 : 0);
						q(`.right_block>.users>.user[data-id="${id}"]>.external_links`).html(`<img class="link" src="svg/link.svg" data-type="round_menu">${acc.tabs.slice(0, 5).map(n => `<img class="link" src="${tabs[id][n].favicon}" data-n="${n}">`).join('')}`);
						round_menu(id);
						active.confirm = false;
						hover();
					}
				});
			}
			if(active.type == 'remove_link'){
				chrome.runtime.sendMessage({type: 'removeHref', n, id});
				acc.tabs = acc.tabs.filter(tab => tab != n);
				q(`.right_block>.users>.user[data-id="${id}"]>.external_links`).html(`<img class="link" src="svg/link.svg" data-type="round_menu">${acc.tabs.slice(0, 5).map(n => `<img class="link" src="${tabs[acc.id][n].favicon}" data-n="${n}">`).join('')}`);
				delete tabs[id][n];
				round_menu(id);
				active.confirm = false;
				hover();
			}
            if(active.type == 'clean_db'){
                chrome.runtime.sendMessage({type: 'clean_db', n, id});
                active.confirm = false;
                hover();
            }
		}
	});

	function copy(text){
		let textarea = document.createElement('textarea');
		textarea.setAttribute('type', 'hidden');
		textarea.textContent = text;
		document.body.appendChild(textarea);
		textarea.select();
		document.execCommand('copy');
		document.body.removeChild(textarea);
	};

	function dialog(h, c, b, l, i){
	    q('#account').class.remove('add').class.remove('edit');
	    q('#background').class.add('active').css('opacity', '0.7');
	    q('.dialog>input[name="twofa"]').css('display', i ? 'block' : 'none').val('');
	    q('.dialog>.LoadingWrapper').css('display', l ? 'block' : 'none');
	    q('.dialog').class.add('active');
	    if(h){
	    	q('.dialog>.heading').html(h);
	    }
	    q('.dialog>.content').html(c);
	    q('.dialog>.button').html(b);
	};

	function lvlToStrClass(lvl = 0){
	    let lvlstr = Math.floor(lvl / 100) * 100 || Math.floor(lvl  / 10) * 10;
	    return `friendPlayerLevel lvl_${lvlstr} lvl_plus_${plus = Math.floor((lvl - lvlstr) / 10) * 10}`;
	}

	function logged_in(){
		req('get', `https://steamcommunity.com/chat/clientjstoken`).always(data => {
			delete localStorage.active;
			q(`.right_block>.users>.user`).class.remove('active');
		    if(data && data.logged_in){
		        q(`.right_block>.users>.user[data-id="${localStorage.active = data.accountid}"`).class.add('active');
		    }
		});
	};

	function contextmenu(event){
		clearTimeout(codeTim); clearInterval(codeInt); clearInterval(lineInt);
		let user = q(this).class.has('menu') ? q(this).parent() : q(this);
		selected = user.data('id');
		let secret = accs.find(acc => acc.id == selected).secret;
		user.class.add('selected');
		q('#menu>[value="confirm"]').css('display', secret.identity ? 'block' : 'none');
		if(secret.shared){
			q('#menu>#twofa').css('display', 'block');
			if(selected){
				chrome.runtime.sendMessage({type: 'getCode', id: selected});
			}else{
				clearTimeout(codeTim); clearInterval(codeInt); clearInterval(lineInt);
			}
			let t = (t => Math.ceil((Math.ceil(Math.ceil(t / 30000) * 30000 - t)) / 1000))(Date.now());
			codeTim = setTimeout(function(){
				if(selected){
					chrome.runtime.sendMessage({type: 'getCode', id: selected});
				}else{
					clearTimeout(codeTim); clearInterval(codeInt); clearInterval(lineInt);
				}
				codeInt = setInterval(function(){
					if(selected){
						chrome.runtime.sendMessage({type: 'getCode', id: selected});
					}else{
						clearTimeout(codeTim); clearInterval(codeInt); clearInterval(lineInt);
					}
				}, 30000);
			}, t * 1000);
			t = (30 - t) * 10;
			lineInt = setInterval(function(){
				q('#twofa>.line').css('margin-left', `-${t = t == 290 ? t = 0 : t + 10}%`);
			},1000);
		}else{
			q('#menu>#twofa').css('display', 'none');
		}
		q('#background').class.add('active').css('opacity', 0.5);
		let offset_menu = q('div#menu').class.add('active').offset(),
		offset_users = q('.right_block>.users').offset(),
		offset_user = user.offset(),
		min_X = offset_users.left + 14,
		min_Y = offset_users.top + 14,
		max_X = offset_user.right - offset_menu.width - 11,
		max_Y = offset_users.bottom - offset_menu.height - 14;
		q('div#menu').css('top', `${event.clientY > max_Y ? max_Y : event.clientY < min_Y ? min_Y : event.clientY}px`).css('left', `${event.clientX > max_X ? max_X : event.clientX < min_X ? min_X : event.clientX}px`);
		event.preventDefault();
	};

	function show_accs(){
		let users = q('.right_block>.users').html(''),
		search = new RegExp(q('#search_acc').val(), 'i');
		for(let acc of accs){
			if(acc.login.search(search) >= 0 || (acc.name || 'No Name').search(search) >= 0){
				users.afterbegin(`<div class="user" data-id="${acc.id}">
					${acc.video ? `<video playsinline muted loop/>
						<source src="${acc.video}" type="video/${acc.video.match(/\.([a-z]+)$/)[1]}">
					</video>` : ''}
					<div class="interface">
						<div value="user"></div>
						<div value="open"></div>
						<div value="refresh"></div>
					</div>
					<img class="avatar" src="${acc.avatar || 'not_avatar.jpg'}"></img>
					${acc.frame ? `<img class="frame" src="${acc.frame}">` : ''}
					<div class="name">
						<span>${acc.name || 'No Name'}</span>
					</div>
					<div class="login">
						<span>${acc.login}</span>
					</div>
					<div class="external_links">
					    <img class="link" src="svg/link.svg" data-type="round_menu">${acc.tabs.slice(0, 5).map(n => `<img class="link" src="${tabs[acc.id][n].favicon}" data-n="${n}">`).join('')}
					</div>
					<div class="level">
						<span>Level</span>
						<div>
							<div class="${lvlToStrClass(acc.lvl || 0)}">
								<span class="friendPlayerLevelNum">${acc.lvl || 0}</span>
							</div>
						</div>
					</div>
					<img class="menu" src="svg/menu.svg">
				</div>`);
			}
		}
		if(localStorage.active){
			q(`.right_block>.users>.user[data-id="${localStorage.active}"`).class.add('active');
		}
		q('.right_block>.users>.user').on('mouseenter', function(event){
		    q(this).select('.users>.user>video').action('play');
		}).on('mouseleave', function(event){
		    let video = q(this).select('.users>.user>video');
		    video.action('pause');
			video.action('currentTime', 0);
		}).on('contextmenu', contextmenu);
		q('.right_block>.users>.user>.menu').on('click', contextmenu);

		q('.right_block>.users>.user>.avatar, .right_block>.users>.user>.frame').on('mousedown', function(event){
		    let id = q(this).parent().data('id');
		    if(!event.button){
			delete localStorage.active;
			q(`.right_block>.users>.user`).class.remove('active');
		        chrome.runtime.sendMessage({type: 'switch', id});
		    }
		    if(event.button == 1){
		        chrome.runtime.sendMessage({type: 'go_over', id, active: true});
		    }
		});

		q('.external_links').on('mousedown', '.link', function(event){
			if(event.button < 2){
				if(q(this).data('type') == 'round_menu'){
					if(!event.button){
				    	round_menu(q(this).parent().parent().class.add('selected').data('id'));
					}
				}else{
					let n = q(this).data('n'),
					id = q(this).parent().parent().data('id');
					let acc = accs.find(acc => acc.id == id);
					acc.tabs.sort((a, b) => a == n ? -1 : b == n ? 1 : 0);
					q(`.right_block>.users>.user[data-id="${id}"]>.external_links`).html(`<img class="link" src="svg/link.svg" data-type="round_menu">${acc.tabs.slice(0, 5).map(n => `<img class="link" src="${tabs[acc.id][n].favicon}" data-n="${n}">`).join('')}`);
					chrome.runtime.sendMessage({type: 'go_over', id, link: tabs[id][n].link, n, active: !event.button});
				}
			}
		});

		q('.right_block>.users>.user>.interface>div[value="user"]').on('click', function(){
			let id = q(this).parent().parent().data('id');
			delete localStorage.active;
			q(`.right_block>.users>.user`).class.remove('active');
			chrome.runtime.sendMessage({type: 'switch', id});
		});

		q('.right_block>.users>.user>.interface>div[value="open"]').on('click', function(){
			let id = q(this).parent().parent().data('id');
			chrome.runtime.sendMessage({type: 'go_over', id, active: true});
		});

		q('.right_block>.users>.user>.interface>div[value="refresh"]').on('click', function(){
			let id = q(this).parent().parent().data('id');
			chrome.runtime.sendMessage({type: 'refresh', id});
		});
	};

	q('div#background, #account>.close, .dialog>.close').on('mousedown', function(){
		active.confirm = false;
		q('div#menu, .dialog, div#background, .round_menu').class.remove('active');
		q('.users>.user').class.remove('selected');
		q('#account').class.remove('add').class.remove('edit');
		localStorage.dialog_heading = localStorage.dialog_content = localStorage.dialog_button = localStorage.dialog_twofa = localStorage.dialog_LoadingWrapper = '';
	});

	q('input#account_name').on('input', function(){
	    if(accs.some(acc => acc.login == q(this).val().toLocaleLowerCase())){
	    	if(q('#account').class.has('add')){
	    		q('#account').class.remove('add').class.add('edit');
	    	}
	    }else{
	    	if(q('#account').class.has('edit')){
	    		q('#account').class.remove('edit').class.add('add');
	    	}
	    }
	});

	q('.head_block>img[data-type="add_acc"]').on('click', function(){
		q('#twofa, #identity_secret, #device_id').val('').attr.add('disabled');
		q('#password').val('');
		q('#account>label[for]').class.remove('active');
		q('#account').class.add('add');
		q('#account_name').val('').attr.remove('readonly').action('focus');
		q('div#background').css('opacity', 0.5).class.add('active');
	});

	q('#search_acc').on('keyup', function(){
		show_accs();
		if(q(this).val().length){
			q('div.head_block>img[data-type="close"]').class.add('active');
		}else{
			q('div.head_block>img[data-type="close"]').class.remove('active');
		}
	});

	q('div.head_block>img[data-type="close"]').on('click', function(){
		q(this).class.remove('active');
		q('#search_acc').val('');
		show_accs();
	});

	q('#menu>div[value], #copy').on('click', function(){
		q(`.right_block>.users>.user[data-id="${selected}"`).class.remove('selected');
		q('div#background').off('mousedown').css('opacity', 1).class.remove('active');
		q('div#menu').class.remove('active');
	});

	q('#menu>[value="confirm"]').on('click', function(){
		chrome.runtime.sendMessage({type: 'confirm', id: selected});
		selected = undefined;
	});

	q('#menu>[value="switch"]').on('click', function(){
		chrome.runtime.sendMessage({type: 'switch', id: selected});
		selected = undefined;
	});

	q('#menu>[value="new_tab"]').on('click', function(){
		chrome.runtime.sendMessage({type: 'go_over', id: selected, active: true});
		selected = undefined;
	});

	q('#menu>[value="re_auth"]').on('click', function(){
		chrome.runtime.sendMessage({type: 're_auth', id: selected});
		localStorage.dialog_heading = 'reauthorize';
		localStorage.dialog_content = `Authorization on the account <span>${accs.find(acc => acc.id == selected).login}</span>`;
		dialog(localStorage.dialog_heading, localStorage.dialog_content, '', localStorage.dialog_LoadingWrapper = true, localStorage.dialog_twofa = '');
		selected = undefined;
	});

	q('#menu>[value="del_acc"]').on('click', function(){
		dialog('delete account from app', `Delete account <span>${accs.find(acc => acc.id == selected).login}</span>?`, '<div class="accept">Yes, delete</div><div class="cancel">Cancel</div>');
		q('.dialog>.button>.accept').on('click', () => {
			chrome.runtime.sendMessage({type: 'del_acc', id: selected});
			accs = accs.filter(acc => acc.id != selected);
			show_accs();
			q('.dialog, #background').class.remove('active');
			localStorage.dialog_heading = localStorage.dialog_content = localStorage.dialog_button = localStorage.dialog_twofa = localStorage.dialog_LoadingWrapper = '';
			selected = undefined;
		});
		q('.dialog>.button>.cancel').on('click', () => {
			q('.dialog, #background').class.remove('active');
			localStorage.dialog_heading = localStorage.dialog_content = localStorage.dialog_button = localStorage.dialog_twofa = localStorage.dialog_LoadingWrapper = '';
			selected = undefined;
		});
	});

	q('#menu>[value="clear_data"]').on('click', function(){
		dialog('deleting cookies', `Delete Cookies <span>${accs.find(acc => acc.id == selected).login}</span>?`, '<div class="accept">Yes, delete</div><div class="cancel">Cancel</div>');
		q('.dialog>.button>.accept').on('click', () => {
			chrome.runtime.sendMessage({type: 'clear_data', id: selected});
			q('.dialog, div#background').class.remove('active');
			localStorage.dialog_heading = localStorage.dialog_content = localStorage.dialog_button = localStorage.dialog_twofa = localStorage.dialog_LoadingWrapper = '';
			selected = undefined;
		});
		q('.dialog>.button>.cancel').on('click', () => {
			q('.dialog, #background').class.remove('active');
			localStorage.dialog_heading = localStorage.dialog_content = localStorage.dialog_button = localStorage.dialog_twofa = localStorage.dialog_LoadingWrapper = '';
			selected = undefined;
		});
	});

	q('#menu>[value="edit_acc"]').on('click', function(){
		q('#account').class.add('edit');
		q('#account_name').val(accs.find(acc => acc.id == selected).login).attr.add('readonly');
		q('#twofa, #identity_secret, #device_id').val('').attr.add('disabled');
		q('#password').val('');
		q('#account>label[for]').class.remove('active');
		q('div#background').css('opacity', 0.5).class.add('active')
	});

	q('#copy').on('click', () => {
		copy(q('#code').text());
		selected = undefined;
	});

	q('#account>label[for="twofa"]').on('click', function(){
		let _this = q(this);
		q('#account>input#twofa').val('');
		if(_this.class.has('active')){
			q('#account>label[for="twofa"]').class.remove('active');
			q('#account>input#twofa').attr.add('disabled');
		}else{
			q('#account>label[for="twofa"]').class.remove('active');
			_this.class.add('active');
			let maxlength =_this.data('maxlength');
			q('#account>input#twofa').attr.remove('disabled').attr('maxlength', maxlength).attr('type', _this.data('type')).attr('name', _this.data('name')).action('focus');
		}
	});

	q('#account>label[for="identity_secret"], #account>label[for="device_id"]').on('click', function(){
		q(`#account>input#${q(this).class.toggle('active').attr('for')}`).val('').attr.toggle('disabled');
	});

	if(/YaBrowser/i.test(navigator.appVersion) && location.hash != '#import'){
		q('#account>#import_maFile').on('click', () => chrome.tabs.create({url: chrome.extension.getURL('popup/popup.html#import'), active: true}));
	}else{
		history.replaceState('', '', '/popup/popup.html');
		q('#account>#import_maFile').on('click', () => q('input[name="import_maFile"]').action('click'));
	}

	q('input[name="import_maFile"]').on('change', function(e){
		let reader = new FileReader(), file;
		reader.readAsText(this.files[0]);
		reader.onload = e => {
			let maFile = JSON.parse(e.target.result);
			maFile = JSON.parse(JSON.stringify(maFile, ['account_name', 'shared_secret', 'identity_secret', 'device_id']));
			q('#account>label[for="twofa"]').class.remove('active');
			q('#account>label[data-name="shared_secret"], #account>label[for="identity_secret"], #account>label[for="device_id"]').class.add('active');
			q('#account>input#twofa').attr.remove('disabled').attr('maxlength', 40).attr('type', 'password').attr('name', 'shared_secret').val(maFile.shared_secret);
			for(let name in maFile){
				q(`#account>input#${name}`).attr.remove('disabled').val(maFile[name]);
			}
		    this.value = '';
		    if(accs.some(acc => acc.login == maFile.account_name.toLocaleLowerCase())){
		    	if(q('#account').class.has('add')){
		    		q('#account').class.remove('add').class.add('edit');
		    		q('#account_name').attr.add('readonly');
		    	}
		    }else{
		    	if(q('#account').class.has('edit')){
		    		q('#account').class.remove('edit').class.add('add');
		    	}
		    }
		};
	});

	q('#account>#save').on('click', function(){
		let forms = {};
		for(let form of document.forms.account){
			if(!form.disabled && !form.hidden){
				forms[form.name] = form.value;
			}
		}
		forms.type = q('#account').class.has('edit') ? 'edit_acc' : 'add_acc';
		if(forms.account_name){
			if(forms.type == 'add_acc' ? forms.password : true){
			    if(!document.forms.account.shared_secret || document.forms.account.shared_secret.disabled || /^[\da-f]{40}$|^[\da-zA-Z+\/]{27}=$/.test(forms.shared_secret) || (forms.type == 'edit_acc' && !forms.shared_secret)){
				    if(document.forms.account.identity_secret.disabled || /^[\da-f]{40}$|^[\da-zA-Z+\/]{27}=$/.test(forms.identity_secret) || (forms.type == 'edit_acc' && !forms.identity_secret)){
				    	if(document.forms.account.device_id.disabled || /^android:[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/.test(forms.device_id) || (forms.type == 'edit_acc' && !forms.device_id)){
				    		chrome.runtime.sendMessage({type: forms.type, data: forms});
				    		localStorage.dialog_heading = forms.type == 'edit_acc' ? 'editing an account' : 'adding an account';
				    		localStorage.dialog_content = `Authorization on the account <span>${forms.account_name.toLocaleLowerCase()}</span>`;
				    		dialog(localStorage.dialog_heading, localStorage.dialog_content, '', localStorage.dialog_LoadingWrapper = true, localStorage.dialog_twofa = '');
				    	}else document.forms.account.device_id.focus();
				    }else document.forms.account.identity_secret.focus();
			    }else document.forms.account.shared_secret.focus();
			}else document.forms.account.password.focus();
		}else document.forms.account.account_name.focus();
	});

	function getAccs(){
		chrome.runtime.sendMessage('getAccs', result => {
			accs = result;
			show_accs();
			if(localStorage.active){
				q(`.right_block>.users>.user[data-id="${localStorage.active}"`).class.add('active');
			}
			q('.users').action('scrollTop', localStorage.scrollTop || 0);
			logged_in();
		});
	};

	getAccs();

	if(localStorage.dialog_LoadingWrapper || localStorage.dialog_twofa){
	    dialog(localStorage.dialog_heading, localStorage.dialog_content, localStorage.dialog_button, localStorage.dialog_LoadingWrapper, localStorage.dialog_twofa);
		q('.dialog>.button>.accept').on('click', () => {
			chrome.runtime.sendMessage({type: 'authCode', authCode: q('.dialog>input[name="twofa"]').val()});
			localStorage.dialog_content = `Authorization on the account <span>${q('.dialog>.content>span').item(0).text()}</span>`;
			dialog(null, localStorage.dialog_content, localStorage.dialog_button = '', localStorage.dialog_LoadingWrapper = true, localStorage.dialog_twofa = '');
		});
		q('.dialog>.button>.cancel').on('click', () => {
			q('.dialog, #background').class.remove('active');
			localStorage.dialog_heading = localStorage.dialog_content = localStorage.dialog_button = localStorage.dialog_twofa = localStorage.dialog_LoadingWrapper = '';
		});
	}

	q('.users').on('scroll', () => localStorage.scrollTop = q('.users').action('scrollTop'));

	chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
		if(message.type == 'auth'){
			if(message.data.success){
				q('#background, .dialog').class.remove('active');
				localStorage.dialog_heading = localStorage.dialog_content = localStorage.dialog_button = localStorage.dialog_twofa = localStorage.dialog_LoadingWrapper = '';
				getAccs();
				chrome.runtime.sendMessage('getTabs', response => {
					tabs = response;
				});
			}else{
			    if(message.data.type){
			    	localStorage.dialog_content = `Authorization on the account <span>${message.login}</span><br>${message.data.message}`;
			    	localStorage.dialog_button = '<div class="accept">Accept</div><div class="cancel">Cancel</div>';
			    	dialog(null, localStorage.dialog_content, localStorage.dialog_button, localStorage.dialog_LoadingWrapper = '', localStorage.dialog_twofa = true);
			    }else{
			    	localStorage.dialog_content = `Authorization on the account <span>${message.login}</span><br><span style="color: red;">${message.data.message}</span>`;
			    	localStorage.dialog_button = '<div class="accept">Try again</div><div class="cancel">Cancel</div>';
			    	localStorage.dialog_twofa = '';
			    	localStorage.dialog_LoadingWrapper = '';
			    	dialog(null, localStorage.dialog_content, localStorage.dialog_button);
			    }
			    q('.dialog>.button>.accept').on('click', () => {
			    	chrome.runtime.sendMessage({type: 'authCode', authCode: q('.dialog>input[name="twofa"]').val()});
			    	localStorage.dialog_content = `Authorization on the account <span>${q('.dialog>.content>span').item(0).text()}</span>`;
			    	dialog(null, localStorage.dialog_content, localStorage.dialog_button = '', localStorage.dialog_LoadingWrapper = true, localStorage.dialog_twofa = '');
			    });
			    q('.dialog>.button>.cancel').on('click', () => {
			    	q('.dialog, #background').class.remove('active');
			    	localStorage.dialog_heading = localStorage.dialog_content = localStorage.dialog_button = localStorage.dialog_twofa = localStorage.dialog_LoadingWrapper = '';
			    });
			}
		}
		if(message.type == 'active'){
			q(`.right_block>.users>.user`).class.remove('active');
		    q(`.right_block>.users>.user[data-id="${localStorage.active = message.id}"`).class.add('active');
		}
		if(message.type == 'twofactorcode'){
			q('#code').text(message.code);
		}
		if(message.type == 'refresh' && accs.some(acc => acc.id == message.id)){
			let acc = Object.assign(accs.find(acc => acc.id == message.id), message.data);
			q(`.right_block>.users>.user[data-id="${message.id}"`).html(`${acc.video ? `<video playsinline muted loop/>
					<source src="${acc.video}" type="video/${acc.video.match(/\.([a-z]+)$/)[1]}">
				</video>` : ''}
				<div class="interface">
					<div value="user"></div>
					<div value="open"></div>
					<div value="refresh"></div>
				</div>
				<img class="avatar" src="${acc.avatar || 'not_avatar.jpg'}"></img>
				${acc.frame ? `<img class="frame" src="${acc.frame}">` : ''}
				<div class="name">
					<span>${acc.name || 'No Name'}</span>
				</div>
				<div class="login">
					<span>${acc.login}</span>
				</div>
				<div class="external_links">
					<img class="link" src="svg/link.svg" data-type="round_menu">${acc.tabs.slice(0, 5).map(n => `<img class="link" src="${tabs[acc.id][n].favicon}" data-n="${n}">`).join('')}
				</div>
				<div class="level">
					<span>Level</span>
					<div>
						<div class="${lvlToStrClass(acc.level || 0)}">
							<span class="friendPlayerLevelNum">${acc.level || 0}</span>
						</div>
					</div>
				</div>
				<img class="menu" src="svg/menu.svg">`);
		}

		q(`.right_block>.users>.user[data-id="${message.id}"]>.external_links`).on('mousedown', '.link', function(event){
			if(event.button < 2){
				if(q(this).data('type') == 'round_menu'){
					if(!event.button){
				    	round_menu(q(this).parent().parent().class.add('selected').data('id'));
					}
				}else{
					let n = q(this).data('n'),
					id = q(this).parent().parent().data('id');
					let acc = accs.find(acc => acc.id == id);
					acc.tabs.sort((a, b) => a == n ? -1 : b == n ? 1 : 0);
					q(`.right_block>.users>.user[data-id="${id}"]>.external_links`).html(`<img class="link" src="svg/link.svg" data-type="round_menu">${acc.tabs.slice(0, 5).map(n => `<img class="link" src="${tabs[acc.id][n].favicon}" data-n="${n}">`).join('')}`);
					chrome.runtime.sendMessage({type: 'go_over', id, link: tabs[id][n].link, n, active: !event.button});
				}
			}
		});

		q(`.right_block>.users>.user[data-id="${message.id}"]`).on('mouseenter', function(event){
		    q(this).select('.users>.user>video').action('play');
		}).on('mouseleave', function(event){
		    let video = q(this).select('.users>.user>video');
		    video.action('pause');
			video.action('currentTime', 0);
		}).on('contextmenu', contextmenu);
		q(`.right_block>.users>.user[data-id="${message.id}"]>.menu`).on('click', contextmenu);

		q(`.right_block>.users>.user[data-id="${message.id}"]>.avatar, .right_block>.users>.user[data-id="${message.id}"]>.frame`).on('mousedown', function(event){
		    let id = q(this).parent().data('id');
		    if(!event.button){
				delete localStorage.active;
				q(`.right_block>.users>.user`).class.remove('active');
		        chrome.runtime.sendMessage({type: 'switch', id});
		    }
		    if(event.button == 1){
		        chrome.runtime.sendMessage({type: 'go_over', id, active: true});
		    }
		});
		q(`.right_block>.users>.user[data-id="${message.id}"]>.interface>div[value="user"]`).on('click', function(){
			let id = q(this).parent().parent().data('id');
			delete localStorage.active;
			q(`.right_block>.users>.user`).class.remove('active');
			chrome.runtime.sendMessage({type: 'switch', id});
		});
		q(`.right_block>.users>.user[data-id="${message.id}"]>.interface>div[value="open"]`).on('click', function(){
			let id = q(this).parent().parent().data('id');
			chrome.runtime.sendMessage({type: 'go_over', id, active: true});
		});
		q(`.right_block>.users>.user[data-id="${message.id}"]>.interface>div[value="refresh"]`).on('click', function(){
			let id = q(this).parent().parent().data('id');
			chrome.runtime.sendMessage({type: 'refresh', id});
		});
	});
})();