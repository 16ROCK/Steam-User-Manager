function q(s){
    let r = s => {
    	let e = Array.isArray(s) ? s : String(s) == '[object NodeList]' ? [...s] : typeof s  == 'string' ? [...document.querySelectorAll(s.replace(/:q\((\d+)\)/, (str, p1) => `:nth-child(${++p1})`))] : [s];
    	e.select = s => r(e.reduce((p, c) => p = [...p, ...c.querySelectorAll(s.replace(/:q\((\d+)\)/, (str, p1) => `:nth-child(${++p1})`))], []));
    	e.child = s => {
    		let c = e.reduce((p, c) => p = [...p, ...c.children], []);
    		if(s){
    			return r(e.reduce((p, c) => p = [...p, ...c.querySelectorAll(s.replace(/:q\((\d+)\)/, (str, p1) => `:nth-child(${++p1})`))], []).filter(s => c.includes(s)));
    		}
    		return r(c);
    	};
    	e.parent = s => {
    		let p = e.reduce((p, c) => p = [...p, c.parentElement], []);
    		if(s){
    			return r([...document.querySelectorAll(s.replace(/:q\((\d+)\)/g, ':nth-child($1)'))].filter(s => p.includes(s)));
    		}
    		return r(p);
    	};
    	e.item = n => r(e[n] || []);
    	e.text = function(s){
    		if(!arguments.length){
    			return e.reduce((p, c) => p + c.innerText, '');
    		}
    		e.forEach(e => e.innerText = s);
    		return e;
    	};
    	e.html = function(s){
    		if(!arguments.length){
    			return e.reduce((p, c) => p + c.innerHTML, '');
    		}
    		e.forEach(e => e.innerHTML = s);
    		return e;
    	};
    	e.checked = function(b){
    		if(arguments.length){
    			e.forEach(e => e.checked = b);
    			return e;
    		}
    		return e[0] ? e[0].checked : undefined;
    	};
    	e.checked.toggle = () => {
    		e.forEach(e => e.checked = !e.checked);
    		return e;
    	};
    	e.data = function(n, v){
    		if(!arguments.length){
    			return e[0] ? e[0].dataset : {};
    		}
        	if(arguments.length < 2){
        		return e[0] ? e[0].dataset[n] : undefined;
        	}
        	e.forEach(e => e.dataset[n] = v);
        	return e;
        };
        e.data.remove = n => {
        	e.forEach(e => delete e.dataset[n]);
        	return e;
        };
        e.attr = function(n, v){
        	if(arguments.length < 2){
        		return e[0] ? e[0].getAttribute(n) : undefined;
        	}
        	e.forEach(e => e.setAttribute(n, v));
        	return e;
        };
        e.attr.add = n => {
        	e.forEach(e => e.setAttribute(n, ''));
        	return e;
        };
        e.attr.toggle = (n, v) => {
            e.forEach(e => e.toggleAttribute(n, v));
            return e;
        };
        e.attr.remove = n => {
            e.forEach(e => e.removeAttribute(n));
            return e;
        };
        e.attr.has = n => e[0] ? e[0].hasAttribute(n) : false;
        e.class = function(n){
        	if(!arguments.length){
        		return e[0] ? e[0].className : undefined;
        	}
        	e.forEach(e => e.className = n);
        	return e;
        }
        e.class.has = n => e[0] ? e[0].classList.contains(n) : false;
        e.class.add = n => {
            e.forEach(e => e.classList.add(n));
            return e;
        };
        e.class.remove = n => {
            e.forEach(e => e.classList.remove(n));
            return e;
        };
        e.class.toggle = n => {
            e.forEach(e => e.classList.toggle(n));
            return e;
        };
        e.remove = () => e.forEach(e => e.remove());
        for(let p of ['afterend', 'beforeend', 'afterbegin', 'beforebegin']){
            e[p] = t => {
            	e.forEach(e => e.insertAdjacentHTML(p, t));
                return e;
            };
        }
        e.css = function(n, v){
        	if(arguments.length < 2){
        		return e[0] ? e[0].style[n] : false;
        	}
        	e.forEach(e => e.style[n] = v);
        	return e;
        };
        e.css.text = v => {
        	e.forEach(e => e.style.cssText = v);
        	return e;
        };
        e.val = function(v){
        	if(arguments.length){
	        	e.forEach(e => e.value = v);
	        	return e;
        	}
        	return e[0] ? e[0].value : undefined;
        };
        e.click = () => {
        	e.forEach(e => e.click());
	        return e;
        };
        e.focus = () => {
        	e.forEach(e => e.focus());
	        return e;
        };
        e.offset = () => e[0] ? e[0].getBoundingClientRect() : {bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0, x: 0, y: 0};
        e.offset.height = () => e[0] ? e[0].offsetHeight : 0;
        e.offset.left = () => e[0] ? e[0].offsetLeft : 0;
        e.offset.top = () => e[0] ? e[0].offsetTop : 0;
        e.offset.width = () => e[0] ? e[0].offsetWidth : 0;
        e.scroll = o => {
	        e.forEach(e => e.scroll(o));
	        return e;
        };
        e.scroll.height = function(p){
        	if(arguments.length){
	        	e.forEach(e => e.scrollHeight = p);
	        	return e;
        	}
        	return e[0] ? e[0].scrollHeight : 0;
        };
        e.scroll.left = function(p){
        	if(arguments.length){
	        	e.forEach(e => e.scrollLeft = p);
	        	return e;
        	}
        	return e[0] ? e[0].scrollLeft : 0;
        };
        e.scroll.top = function(p){
        	if(arguments.length){
	        	e.forEach(e => e.scrollTop = p);
	        	return e;
        	}
        	return e[0] ? e[0].scrollTop : 0;
        };
        e.scroll.width = function(p){
        	if(arguments.length){
	        	e.forEach(e => e.scrollWidth = p);
	        	return e;
        	}
        	return e[0] ? e[0].scrollWidth : 0;
        };
       	e.action = function(){
       		if(arguments.length){
                for(let element of e){
                    if(typeof element[arguments[0]] == 'function'){
                         element[arguments[0]](...[...arguments].slice(1, arguments.length));
                     }else{
                        if(arguments.length > 1){
                            element[arguments[0]] = arguments[1];
                        }else{
                            return element[arguments[0]];
                        }
                     }
                }
                return e;
       		}
       		return e;
       	};
        e.on = (a, b, c) => {
            let g = (a, b, c, d) => {
                for(let e of d.path || []){
                	for(let f of a.querySelectorAll(b)){
                        if(e == f) {
                            c.bind(f)(d);
                            break;
                        }
                	}
                }
            };
			e.forEach(e => {
                let f = typeof c == 'function' ? ev => g(e, b, c, ev) : b;
                q.event.push([e, a, f]);
                e.addEventListener(a, f);
            });
			return e;
        };
        e.off = function(){
            let event = q.event.filter(event => e.includes(event[0]) && arguments.length ? [...arguments].includes(event[1]) : true);
            event.forEach(e => {
                e[0].removeEventListener([1], e[2]);
            });
            q.event = q.event.filter(ev => !event.includes(ev));
            return e;
        };
        return e;
    };
    return r(s);
};
q.event = [];