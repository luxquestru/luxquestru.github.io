/**
 * An object that holds the quest environment, handles user input and server communication.
 * @constructor
 */
var Authorizer = function (doc, app) {
	/*
	 * DOM cache
	 */
	this.ui = {
		doc: null,
		overlay: null,
		popupAuth: null,
		popupAuthClose: null,
		popupAuthLogin: null,
		popupAuthPass:  null,
		popupAuthSubmit: null,
		popupReg: null,
		popupRegClose: null,
		popupRegEmail: null,
        popupRegPhone: null,
		popupRegPass: null,
		popupRegCodeBlock: null,
		popupRegCode: null,
		popupRegSubmit: null,
		headerAuth: null,
		headerUser: null
	};

	this.app = null;
	this.sid = 0;
	this.codeSent = false;
	this.login = '';
	this.phone = '';
	this.specialization = '';
	this.workplace = '';
    this.gamePage = false;

	this.store = function(sid) {
		console.log('Authorizer.store: sid=' + sid);
		this.sid = sid;
		if (sid) setCookie('sid', sid);
		else deleteCookie('sid');
		if(this.ui.headerAuth != null)  this.ui.headerAuth.style.display = sid ? 'none' : 'block';
		if(this.ui.headerUser != null)  this.ui.headerUser.style.display = sid ? 'block' : 'none';
        if(this.ui.headerLogin != null) this.ui.headerLogin.style.display = sid ? 'none' : 'block';
        if(this.ui.headerRegister != null)   this.ui.headerRegister.style.display = sid ? 'none' : 'block';
        if(this.ui.headerRegisterButton != null)   this.ui.headerRegisterButton.style.display = sid ? 'none' : 'block';
        if(this.ui.headerUserValue != null) this.ui.headerUserValue.innerHTML = this.login;
		if (this.app) this.app.setSID(this.sid);
	};

	this.isAuthorized = function()
	{
		var sid = getCookie('sid');
		console.log('Authorizer.isAuthorized: sid=' + sid);
		if (sid !== false) {
			$.getJSON(WEB_SESSION_VERIFY, {sid: sid}, createListenerFunction(this.verifySessionListener, this));
		} else {
			this.ui.headerAuth.style.display = 'block';
            this.store(null);
		}
	};

	this.verifySessionListener = function(data, textStatus) {
		if (textStatus == 'success') {
			if (data.ErrorCode == 0) {
				this.login = data.Message.login;
				this.store(getCookie('sid'));
                if(this.gamePage) {
                    this.app.startScenario();
                }
				return;
			}
		}
		this.sid = 0;
		setCookie('sid', null);
	};

	this.authorizeOrRegister = function() {
		this.ui.overlay.style.display = 'block';
		this.ui.popupAuth.style.display = 'block';
		this.ui.popupAuth.style.left = "33%";
		this.ui.popupReg.style.display = 'block';
		this.ui.popupReg.style.left = "66%";
		this.ui.popupRegCodeBlock.style.display = 'none';
		this.codeSent = false;
	};

	this.authorize = function() {
		this.ui.overlay.style.display = 'block';
		this.ui.popupAuth.style.display = 'block';
		this.ui.popupAuth.style.left = "50%";
	};

	this.register = function() {
		this.ui.overlay.style.display = 'block';
		this.ui.popupReg.style.display = 'block';
		this.ui.popupReg.style.left = "50%";
		this.codeSent = false;
	};

	this.submitAuth = function(e) {
		this.login = this.ui.popupAuthLogin.value;
		$.getJSON(
			WEB_AUTHORIZE,
			{
				username: this.ui.popupAuthLogin.value,
				pwd:      this.ui.popupAuthPass.value
			},
			createListenerFunction(this.submitAuthListener, this)
		);
		if (e) e.preventDefault();
	};

	this.submitAuthListener = function(data, textStatus) {
		if (textStatus == 'success') {
			if (data.ErrorCode == 0 && data.Message) {
				if (data.Message.sid) {
                    this.store(data.Message.sid);
                    // window.location = "./index.html"
                    window.location = "./question.html"
				} else {
					alert(data.Message);
				}
			} else {
				alert('Авторизация не удалась. Возможно это из-за того что вы не верно ввели логин или пароль');
			}
		} else {
			alert('Request failed, try again later');
		}
	};

	this.submitReg = function(e) {
		this.login = this.ui.popupRegName.value;
        this.codeSent = this.ui.popupRegCode.value

		if (this.codeSent) {
			$.getJSON(
				WEB_REGISTER_2,
				{
					email: this.ui.popupRegEmail.value,
                    name: this.ui.popupRegName.value,
					phone: this.ui.popupRegPhone.value,
                    workplace: this.ui.popupRegJob.value,
                    specialization: this.ui.popupRegSpecial.value,
					pwd:  this.ui.popupRegPass.value,
					code: this.ui.popupRegCode.value
				},
				createListenerFunction(this.submitRegListener, this)
			);
		} else {
			$.getJSON(
				WEB_REGISTER_1,
				{
                    email: this.ui.popupRegEmail.value,
                    name: this.ui.popupRegName.value,
                    phone: this.ui.popupRegPhone.value,
                    workplace: this.ui.popupRegJob.value,
                    specialization: this.ui.popupRegSpecial.value,
                    pwd:  this.ui.popupRegPass.value,
				},
				createListenerFunction(this.submitRegListener, this)
			);
		}

		if (e) e.preventDefault();
	};

	this.submitRegListener = function(data, textStatus) {
		if (textStatus == 'success') {
			if (data.ErrorCode == 0) {
				if (this.codeSent) {
					if (data.Message) {
						if (data.Message.sid) {
							alert('Успешная регистрация');
							this.store(data.Message.sid);
                            // window.location = "./index.html"
                             window.location = "./question.html"
						} else {
							alert(data.Message);
						}
					} else {
						alert('Registration failed: internal error. Try again later.')
					}
				} else {
					this.ui.popupRegCodeBlock.style.display = 'block';
					this.codeSent = true;
				}
			} else {
				if (this.codeSent)
					alert('Вы ввели не верный проверочный код');
				else {
					if(data.ErrorCode == 6)
					{
					        alert('Вы ввели номер телефона не в международном формате');
					} else {
						alert('Registration failed, try again later');
					}
				}
			}
		} else {
			alert('Request failed, try again later');
		}
	};

	this.closeAuthPopup = function(e) {
		this.ui.popupAuth.style.display = 'none';
		this.ui.popupReg.style.display = 'none';
		this.ui.overlay.style.display = 'none';
		if (e) e.preventDefault();
	};

	this.closeRegPopup = function(e) {
		this.ui.popupAuth.style.display = 'none';
		this.ui.popupReg.style.display = 'none';
		this.ui.overlay.style.display = 'none';
		if (e) e.preventDefault();
	};

	this.logout = function(e) {
		if (confirm('Выйти из игры?')) {
			this.store(null);
		}
		e.preventDefault();
	};

	if (app) this.app = app;
	this.ui.doc = doc;
	this.ui.overlay           = doc.getElementById(QUEST_ELEMENT_ID.overlayId);
	this.ui.popupAuth         = doc.getElementById(QUEST_ELEMENT_ID.popupAuthId);
	this.ui.popupAuthClose    = doc.getElementById(QUEST_ELEMENT_ID.popupAuthCloseId);
	this.ui.popupAuthLogin    = doc.getElementById(QUEST_ELEMENT_ID.popupAuthLoginId);
	this.ui.popupAuthPass     = doc.getElementById(QUEST_ELEMENT_ID.popupAuthPassId);
	this.ui.popupAuthSubmit   = doc.getElementById(QUEST_ELEMENT_ID.popupAuthSubmitId);

    this.ui.heroArea          = doc.getElementById(QUEST_ELEMENT_ID.heroArea);
    this.ui.headerLogin       = doc.getElementById(QUEST_ELEMENT_ID.headerLoginId);
    this.ui.headerLogout      = doc.getElementById(QUEST_ELEMENT_ID.headerLogoutId);
    this.ui.headerRegister    = doc.getElementById(QUEST_ELEMENT_ID.headerRegisterId);
    this.ui.headerRegisterButton = doc.getElementById(QUEST_ELEMENT_ID.headerRegisterButtonId);
	this.ui.popupReg          = doc.getElementById(QUEST_ELEMENT_ID.popupRegId);
	this.ui.popupRegName      = doc.getElementById(QUEST_ELEMENT_ID.popupRegNameId);
	this.ui.popupRegEmail     = doc.getElementById(QUEST_ELEMENT_ID.popupRegEmailId);
	this.ui.popupRegPass      = doc.getElementById(QUEST_ELEMENT_ID.popupRegPassId);
	this.ui.popupRegJob       = doc.getElementById(QUEST_ELEMENT_ID.popupRegJobId);
	this.ui.popupRegSpecial   = doc.getElementById(QUEST_ELEMENT_ID.popupRegSpecialId);
	this.ui.popupRegPhone     = doc.getElementById(QUEST_ELEMENT_ID.popupRegPhoneId);
	this.ui.popupRegClose     = doc.getElementById(QUEST_ELEMENT_ID.popupRegCloseId);
	this.ui.popupRegCodeBlock = doc.getElementById(QUEST_ELEMENT_ID.popupRegCodeBlockId);
	this.ui.popupRegCode      = doc.getElementById(QUEST_ELEMENT_ID.popupRegCodeId);
	this.ui.popupRegSubmit    = doc.getElementById(QUEST_ELEMENT_ID.popupRegSubmitId);
	this.ui.headerAuth        = doc.getElementById(QUEST_ELEMENT_ID.headerAuthBlockId);
	this.ui.headerUser        = doc.getElementById(QUEST_ELEMENT_ID.headerUserBlockId);
    this.ui.headerUserValue   = doc.getElementById(QUEST_ELEMENT_ID.headerUserValue);

    this.ui.startScreen       = doc.getElementById(QUEST_ELEMENT_ID.startScreenId);

	//bindEvent(this.ui.headerLogin,    'click', createListenerFunction(this.authorize, this));
	bindEvent(this.ui.headerRegister, 'click', createListenerFunction(this.register, this));
	bindEvent(this.ui.headerLogout,   'click', createListenerFunction(this.logout, this));
	bindEvent(this.ui.popupAuthClose, 'click', createListenerFunction(this.closeAuthPopup, this));
	bindEvent(this.ui.popupRegClose,  'click', createListenerFunction(this.closeRegPopup, this));
	bindEvent(this.ui.popupAuthSubmit,'click', createListenerFunction(this.submitAuth, this));
	bindEvent(this.ui.popupRegSubmit, 'click', createListenerFunction(this.submitReg, this));
};