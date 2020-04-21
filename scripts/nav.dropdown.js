$(document).ready(function() {
    // globals
    var hasTouch = false,
        hasCSSTransitions = false,
        clickEventName = "click",
        transitionEventName = null;

    if (window.Modernizr) {
        if (Modernizr.touch) {
            hasTouch = true;
            //clickEventName = "touchstart";
        }

        if (Modernizr.csstransitions) {
            hasCSSTransitions = true;
            transitionEventName = "transitionnoop";
        }
    }

    // event namespace
    var ns = "navdd";

    var Nav = function (element, options) {
        this.init.apply(this, arguments);
        return this;
    };

    Nav.prototype = {
        init: function (element, options) {
            this.element = $(element);
            this.options = $.extend({}, Nav.defaults, options || {});
            this.toggle = $(this.options.toggleSelector);

            // state related
            this.isEnabled = false;
            this.isShown = false;
            this.isTransitioning = false;
            this._titles = [];
            this._subs = [];
            this._states = [];
            this.length = 0;
            //this._parents = [];
            this.scale = 0;
            this.state = null;
            this._currStateIndex = -1;

            this.setBinds();
            return this;
        },

        setBinds: function () {
            // bind instance method context
            var methods = ["onTouch", "onBodyTouch", "onResize", "onToggleTouch", "onTitleTouch", "onTransitionEnd"],
                m;
            for (var i = 0, l = methods.length; i < l; i++) {
                m = methods[i];
                this[m] = $.proxy(this[m], this);
            }
            return this;
        },

        ensureTitle: function (navItem, subNav) {
            var options = this.options,
                titleNode = subNav.data("navddTitle");

            if (!titleNode) {
                titleNode = $(options.titleFactory.call(this, navItem, subNav));
                firstback = titleNode.first();
                firstback.on(clickEventName + "." + ns, this.onTitleTouch);
                //titleNode.on(clickEventName + "." + ns, this.onTitleTouch);
                titleNode.data({
                    isTitle: true,
                    parentNavItem: navItem
                });
                subNav.prepend(titleNode);
                subNav.data("navddTitle", titleNode);
                this._subs.push(subNav);
                this._titles.push(titleNode);
            }

            return this;
        },

        go: function (count, silent) {
            var currStateIndex = this._currStateIndex,
                states = [].slice.call(this._states),
                newState,
                newStateIndex,
                subNav;

            var options = this.options;

            // going forward
            if (count > 0) {
                //count = Math.min(states.length, currStateIndex + count);
                newStateIndex = currStateIndex + count;
                newState = states[newStateIndex];
                subNav = $(options.subNavSelector, newState);


                // add current class and check for title node
                for (var i = currStateIndex + 1, l = newStateIndex; i < l + 1; i++) {
                    $(states[i]).addClass(options.currentParentClass);
                    this.ensureTitle($(states[i]), subNav);
                }
            }
                // going backward
            else if (count < 0) {
                //count = Math.max(0, currStateIndex + count);
                newStateIndex = currStateIndex + count;
                newState = states[newStateIndex];
                subNav = $(options.subNavSelector, newState);

                // remove current class
                for (var i = currStateIndex, l = newStateIndex; i > l; i--) {
                    $(states[i]).removeClass(options.currentParentClass);
                }
            }

            this.onResize();
            this.element.css({
                left: -(this.scale * (newStateIndex + 1)) + "px",
                height: "" //(newState ? $(options.subNavSelector, newState) : this.element).height()
            });

            this.state = newState || null;
            this._currStateIndex = newStateIndex;
            if (!silent) this.element.trigger(ns + ".statechange");

            return this;
        },

        push: function (navItem) {
            var states = [].slice.call(this._states),
                currStateIndex = this._currStateIndex;
            //currStateIndex = $.inArray(currState, states);

            // if our current index isn't the tip of the states
            // then we need to remove the tail after the currStateIndex
            // and push the new navItem onto the tail
            if (currStateIndex !== states.length - 1) {
                states.splice(currStateIndex + 1, states.length - currStateIndex);
            }

            states.push(navItem);
            this._states = states;
            this.length = states.length;
            this.state = navItem;
            return this;
        },

        back: function () {
            this.go(-1);
            return this;
        },

        forward: function () {
            this.go(1);
            return this;
        },

        show: function () {
            // show nav
            if (this.isEnabled && !this.isShown) {
                var options = this.options;

                this.element.trigger(ns + ".showing");
                this.toggle.addClass(options.toggleActiveClass);
                this.element.addClass(options.activeClass);
                $(document.body).on(clickEventName + "." + ns, this.onBodyTouch);
                //options.autoNavigate && $(options.autoNavigate, this.element).trigger(clickEventName + "." + ns);
                this.onResize();
                this.element.trigger(ns + ".shown");
                this.isShown = true;
            }
            return this;
        },

        hide: function () {
            // hide nav
            if (this.isEnabled && this.isShown) {
                var options = this.options;

                this.element.trigger(ns + ".hiding");
                this.toggle.removeClass(options.toggleActiveClass);
                this.element.removeClass(options.activeClass);
                $(document.body).off(clickEventName + "." + ns, this.onBodyTouch);
                this.element.trigger(ns + ".hidden");
                this.isShown = false;
            }
            return this;
        },

        enable: function () {
            if (!this.isEnabled) {
                var options = this.options;
                this.element.trigger(ns + ".enabling");

                this.element.on(clickEventName + "." + ns, options.navItemTag, this.onTouch);
                $(window).on("resize." + ns, this.onResize).trigger("resize." + ns);
                $(window).on("orientationchange." + ns, this.onResize).trigger("resize." + ns);
                this.toggle.on(clickEventName + "." + ns, this.onToggleTouch);

                // add sub nav classes
                $(options.navItemTag, this.element).each(function (index, el) {
                    var sub = $(options.subNavSelector, el);
                    if (sub.length) $(el).addClass(options.withSubClass);
                });

                this.isEnabled = true;
                this.element.trigger(ns + ".enabled");
            }
            return this;
        },

        disable: function () {
            if (this.isEnabled) {
                var options = this.options;
                this.element.trigger(ns + ".disabling");

                // remove events
                this.element.off(clickEventName + "." + ns, options.navItemTag, this.onTouch);
                $(window).off("resize." + ns, this.onResize);
                $(window).off("orientationchange." + ns, this.onResize);
                this.toggle.off(clickEventName, this.onToggleTouch);
                $(document.body).off(clickEventName + "." + ns, this.onBodyTouch);

                // remove inline styles and data
                this.cleanup();

                // reset state
                this._titles = [];
                this._subs = [];
                this._states = [];
                this.length = 0;
                this.scale = 0;
                this.state = null;
                this._currStateIndex = -1;
                this.isShown = false;
                this.isTransitioning = false;
                this.isEnabled = false;

                this.element.trigger(ns + ".disabled");
            }
            return this;
        },

        cleanup: function () {
            // remove footprint
            var options = this.options;

            var subs = this._subs,
                sub;

            for (var i = 0, l = subs.length; i < l; i++) {
                sub = subs[i];
                sub.css({
                    width: "",
                    left: ""
                });

                sub.data("navddTitle").remove();
                sub.removeData("navddTitle");
            }

            $("." + options.withSubClass, this.element).removeClass(options.withSubClass);
            $("." + options.currentParentClass, this.element).removeClass(options.currentParentClass);

            this._parents = [];
            this._subs = [];

            var element = this.element;
            element.css({
                width: "",
                height: "",
                left: ""
            });
            element.removeClass(options.transitionClass);
            element.removeClass(options.activeClass);

            this.toggle.removeClass(options.toggleActiveClass);

            return this;
        },

        // event handlers
        onTouch: function (event) {
            var options = this.options,
                $el = $(event.currentTarget);

            event.stopPropagation();

            if ($el.find(options.subNavSelector).length) {
                event.preventDefault();
                this.push(event.currentTarget);
                this.go(1);
            }
        },

        onBodyTouch: function (event) {
            if (this.options.closeOnBodyTouch) {
                if (event.target &&
                    event.target !== this.toggle.get(0) &&
                    event.target !== this.element.get(0) &&
                    !$.contains(this.element[0], event.target)) {
                    this.hide();
                }
            }
        },

        onTitleTouch: function (event) {
            event.preventDefault();
            event.stopPropagation();
            this.back();
        },

        onToggleTouch: function (event) {
            event.preventDefault();
            this[this.isShown ? "hide" : "show"]();
        },

        onResize: function () {
            var subs = this._subs,
                options = this.options,
                scale = this.scale = $(window).width() || options.defaultScale;

            // in case width matches viewports, 
            // update properties on resize
            for (var i = 0, l = subs.length; i < l; i++) {
                subs[i].css({
                    left: scale,
                    width: scale
                });
            }

            this.element.removeClass(options.transitionClass).css("left", -(scale * (this._currStateIndex + 1)) + "px");
        },

        onTransitionEnd: function () {
            this.element.removeClass(this.options.transitionClass);
            this.isTransitioning = false;
        }
    };

    // default options
    Nav.defaults = {
        // selectors
        navItemTag: "li",
        subNavSelector: "> ul",
        toggleSelector: ".navdd-toggle",
        titleTextSelector: "> a",
        autoNavigateTo: ".active",

        // classes
        activeClass: "active",
        currentParentClass: "current",
        withSubClass: "with-sub",
        toggleActiveClass: "active",
        titleClass: "name",
        transitionClass: "is-transitioning",

        closeOnBodyTouch: false,
        defaultScale: 320,

        // returns the title node thats inserted
        // at the top of each sub nav
        titleFactory: function (navItem, subNav) {
            return ("<li class='" + this.options.titleClass + "'><a><span>Back</span></a></li> <li><a href=" + $(this.options.titleTextSelector, navItem).attr('href') + ">" +
                $(this.options.titleTextSelector, navItem).html() + "</a></li>");
        }
    };

    // convenience hook for jquery
    $.fn.navDropdown = function (options) {
        return this.each(function () {
            var nav = new Nav(this, options);
            $(this).data("navDropdown", nav);
        });
    };

    return Nav;
});
                