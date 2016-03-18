/**
 *
 * spot.js
 *
 * pc页面打点工具，接受不同参数进行数据上报
 *
 *
 * 
 * url // 当前页面的 URL
 * action // 用户每个操作的名字，或者页面加载后主动发的页面名称
 * channel //市场投放的 channel id，一般会在 URL 后面添加?channel=qudao1
 * unique_id // 用户唯一的ID
 * session // 会话
 * referer // 来源
 * timestamp // 时间戳
 * city_channel // 进入的城市 Channel id。如北京 140，上海 104。在商品详情页，如果存在多个城市的话提交为数组1
 * p_day // 当天日期，如 2015-12-12
 * span_id //浏览器窗口1
 * ext // 每个 Action 的扩展消息
 * user_id // 用户登录后的user id，用于判断页面的登录还是未登录的状态
 */

;
(function(window, $) {
	'use strcit'

	function json2str(o) {
		var arr = [];
		var fmt = function(s) {
			if (typeof s == 'object' && s != null) return json2str(s);
			return /^(string|number)$/.test(typeof s) ? '"' + s + '"' : s;
		}

		if (o instanceof Array) {
			for (var i in o) arr.push(fmt(o[i]));
			return '[' + arr.join(',') + ']'
		} else {
			for (var i in o) arr.push('"' + i + '":' + fmt(o[i]));
			return '{' + arr.join(',') + '}';
		}
	}

	function generateUUID() {
		var d = new Date().getTime();
		var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = (d + Math.random() * 16) % 16 | 0;
			d = Math.floor(d / 16);
			return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
		});
		return uuid;
	};

	var

		_d = new Date(),

		/**
		 * [_url 打点上报地址]
		 *
		 * 正式 https://action.seriousapps.cn/data/collect
		 */
		//正式
		_url = 'https://action.seriousapps.cn/data/collect?',
		/**
		 * [_public_param 公共字段]
		 * 不能被污染
		 * @type {Object}
		 */
		_public_param = {
			//页面配置 @options in init function
			channel: '',
			unique_id: '',
			session: '',
			city_channel: '',
			span_id: '',
			user_id: '',

			//JS原生获得
			url: window.location.href,
			referer: document.referrer,
			p_day: _d.getFullYear() + '-' + (_d.getMonth() + 1) + '-' + _d.getDate(),

			//后配置
			timestamp: '',
			ext: {}
		},



		/**
		 * [_param_format 处理，格式化字段]
		 * @param  {[object]} params [自定义字段]
		 * @return {[string]}        [格式化后的字段字符串]
		 */
		_param_format = function(params) {
			var _p = $.extend(false, _public_param, params)

			if (_p.ext) {
				_p.ext = json2str(_p.ext)
			}

			return $.param(_p)
		},

		/**
		 * [_report 上报方法]
		 * @param  {[object]} params [自定义字段]
		 */
		_report = function(params) {

			var
				_image = new Image(),
				_ext = {}

			//不覆盖基本配置，只用作当前上传使用
			params = $.extend(false, _public_param, params)
			params.timestamp = (new Date()).getTime()

			if (params.ext) {
				params.ext = $.extend(false, _public_param.ext, params.ext)
			}

			_image.src = _url + _param_format(params)
		};

	//单例
	window.SPOT = {

		cacheAct: [],


		hook: 'spot',
		/**
		 * [set_params 页面开始调用之前需要初始化]
		 * @param  {[object]} options [页面配置传入 ]
		 * @return {[type]}         [description]
		 */
		set_params: function(options) {
			//更新基本字段配置
			$.extend(_public_param, options)
			return this
		},

		/**
		 * [act 普通上报方法，接受方法名和自定义字段]
		 */
		act: function(act, params) {

			//如果当前unique_id还没有计算出来,则把当前的事件缓存起来,一会再触发
			if (!_public_param.unique_id) {
				this.cacheAct.push({
					act: act,
					params: params
				})
				return
			}

			if (!act) return

			params = params || {}
			params.action = act

			_report(params)
			return this
		},

		/**
		 * [act_click 常用的方法封装]
		 * @param  {[object]} params [自定义字段]
		 */
		act_click: function(params) {
			return this.act('click', params)
		},

		/**
		 * [auto_act_click 自动添加页面点击事件上报]
		 */
		auto_act_click: function() {

			var
				_self = this

			$('body').on('click', '[' + this.hook + ']', function() {

				var
					_data = $(this).data('spot')

				if (!_data) return

				_self.act_click({
					ext: {
						name: _data
					}
				})
			})
		}
	}

	new Fingerprint2().get(function(result) {
		_public_param.unique_id = result
	});

	//触发缓存的事件
	var timer = setInterval(function() {
		if (_public_param.unique_id) {
			clearInterval(timer)
			window.SPOT.cacheAct.map(function(value) {
				window.SPOT.act(value.act, value.params)
			})
			window.SPOT.cacheAct = []
		}
	}, 50)

	//创建session
	if (!Cookies.get('rb_strack')) {
		var date = new Date();
		var minutes = 30;
		date.setTime(date.getTime() + (minutes * 60 * 1000));
		Cookies.set('rb_strack', generateUUID(), {
			expires: date,
			domain: 'ricebook.com'
		})
	}

	window.SPOT.set_params({
		session: Cookies.get('rb_strack')
	})


})(window, $)