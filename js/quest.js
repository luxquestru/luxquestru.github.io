
/**
 * An object that holds the quest environment, handles user input and server communication.
 * @constructor
 */
var QuestApplication = function (doc) {
	/*
	 * DOM cache
	 */
	this.ui = {
		doc:             null,
		nextButton:      null,
		nextButtonBlock: null,
		startScreen:     null,
		gameScreen:      null,
		levelHistory:    null
	};

	this.sid          = 0;
	this.levelFactory = null;
	this.state        = QUEST_STATE.authorization;
	this.level        = null;
	this.nextLevel    = null;
	this.scenario     = '';
	this.attemptGUID  = '';
	this.scenarioPending = null;

	this.getDocument = function() {
		return this.ui.doc;
	};

	this.getScenario = function() {
		return this.scenario;
	};

	this.getSID = function() {
		return this.sid;
	};

	this.setSID = function(sid) {
		//console.log('QuestApplication.setSID: ' + sid);
		this.sid = sid;
		if (sid) {
			if (this.scenarioPending) this.scenarioPending();
			else this.setState(QUEST_STATE.scenarioSelection);
		}
		else this.setState(QUEST_STATE.authorization);
	};

	this.updateUI = function() {
		/*this.ui.startScreen.style.display = this.state == QUEST_STATE.authorization ||
			this.state == QUEST_STATE.scenarioSelection ? 'block' : 'none';*/
		if(this.ui.scenarios != null) {
			this.ui.scenarios.style.display = this.state == QUEST_STATE.authorization || this.state == QUEST_STATE.scenarioSelection ? 'block' : 'none';
		}
		if(this.ui.gameScreen != null) {
			this.ui.gameScreen.style.display = this.state == QUEST_STATE.playing ? 'block' : 'none';
		}
		if(this.ui.nextButtonBlock != null) {
			this.ui.nextButtonBlock.style.display = this.state == QUEST_STATE.playing ? 'block' : 'none';
		}
	};

	this.setState = function(state) {
		if (this.state != state) {
			if (state != QUEST_STATE.playing && this.level) {
				this.level.hideLevel();
				delete this.level;
			}
			this.state = state;
			this.updateUI();
		}
	};

	this.updateHistory = function(history) {
		this.ui.levelHistory.innerHTML = '';

		if (!history || history.length == 0) {
			this.ui.levelHistory.parentNode.style.display = 'none';
			return;
		}

		var count = history.length;
		var listHTML = '';
		for (var i = 0; i < count; i++) {
			listHTML += '<li' + (i == count-1 ? ' class="act"' : '') + '><img alt="" src="' + history[i] + '"><span>&nbsp;</span></li>';
		}
		this.ui.levelHistory.innerHTML = listHTML;
		this.ui.levelHistory.parentNode.style.display = 'block';
	};

	/**
	 * Hides the previous level if exists and displays the next one if exists.
	 */
	this.showNextLevel = function() {
		if (this.level) {
			this.level.hideLevel();
			delete this.level;
		}

		if (this.nextLevel) {
			this.level = this.nextLevel;
			this.level.displayLevel();
			$.scrollTo('#screen_game', 800);
			this.nextLevel = null;
		}
	};

	/**
	 * Handles `next` button click.
	 * For now it shows the answer in json format for quiz and text level types and attempts to
	 * upload file for file level type. TODO: recode.
	 * @param e event object
	 */
	this.onButtonClicked = function(e) {
		e.preventDefault();
		if (! this.level) return;

		if (this.nextLevel) {
			this.showNextLevel();
			return;
		}

		if (this.level.validateAnswers())
			this.checkAnswer();
		else
			alert('Нужны все ответы');
	};

	/**
	 * Handles backend response. Tries to extract level details, error info, etc. Proceeds according to
	 * response.
	 * @param response response object (evaluated json)
	 */
	this.handleResponse = function(response) {
		this.updateHistory(response.history);

		//console.log(response);
		var level = this.levelFactory.tryInitializeFromResponse(response);
		if (level instanceof Level) {
			this.setState(QUEST_STATE.playing);
			this.nextLevel = level;
			this.ui.nextButton.innerHTML = LEVEL_NEXT_CAPTION['complete'];
			this.ui.nextButtonBlock.style.display = 'block';
			if (this.level == null || this.level.levelType != LEVEL_TYPE.file) this.showNextLevel();
		} else console.log(level);
	};

	this.scenarioITClick = function(e) {
		if (e) e.preventDefault();
		if (!this.sid) {
			authorizer.authorizeOrRegister();
			this.scenarioPending = createListenerFunction(this.scenarioITClick, this);
			return;
		}
		this.scenarioPending = null;
		this.scenario = 'P';
		$.getJSON(
			WEB_GET_LATEST_LEVEL,
			{
				sid: this.sid,
				scenario: 'P'
			},
			createListenerFunction(this.levelListener, this)
		);
	};

	this.scenarioKClick = function(e) {
		if (e) e.preventDefault();
		if (!this.sid) {
			authorizer.authorizeOrRegister();
			this.scenarioPending = createListenerFunction(this.scenarioKClick, this);
			return;
		}
		this.scenarioPending = null;
		this.scenario = 'K';
		$.getJSON(
			WEB_GET_LATEST_LEVEL,
			{
				sid: this.sid,
				scenario: 'K'
			},
			createListenerFunction(this.levelListener, this)
		);
	};

	this.levelListener = function(data, textStatus) {
		if (textStatus == 'success') {
			if (data && data.ErrorCode == 0 && data.Message) {
				this.handleResponse(data.Message);
				$.scrollTo('#screen_game', 800);
			}
		} else {
			alert('Level request failed, please try again later.');
		}
	};

	this.closeNotice = function(e) {
		if (e && e.target && isHTMLObject(e.target, 'HTMLAnchorElement')) {
			if (e.target.className == 'cloze' && e.target.parentNode) {
				var div = e.target.parentNode;
				if (div.className.indexOf('notice') != -1) {
					$(div).fadeOut("slow");
				}
				e.preventDefault();
			}
		}
	};

	this.checkAnswer = function() {
		this.attemptGUID = '';
		var url = WEB_CHECK_RESULT + '?sid=' + this.sid + '&scenario=' + this.scenario;
		url += '&answer=' + encodeURIComponent(this.level.getAnswers());

		$.ajax({
			url: url,
			dataType: 'json',
			success: createListenerFunction(this.checkAnswerListener, this),
			type: 'POST'
		});
	};

	this.checkAnswerListener = function(data, textStatus) {
		if (textStatus == 'success') {
			if (data && data.ErrorCode == 0 && data.Message && data.Message.level) {
				this.handleResponse(data.Message.level);
			} else {
				alert('Check answer request failed, try again later');
			}
		}
	};

	/*
	 * Constructor code goes here
	 */

	this.ui.doc = doc;
	this.ui.nextButton      = doc.getElementById(QUEST_ELEMENT_ID.nextButtonId);
	this.ui.nextButtonBlock = doc.getElementById(QUEST_ELEMENT_ID.nextButtonBlockId);
	this.ui.startScreen     = doc.getElementById(QUEST_ELEMENT_ID.startScreenId);
	this.ui.gameScreen      = doc.getElementById(QUEST_ELEMENT_ID.gameScreenId);
	this.ui.scenarios       = doc.getElementById(QUEST_ELEMENT_ID.scenariosId);
	this.ui.levelHistory    = doc.getElementById(QUEST_ELEMENT_ID.levelHistoryListId);

	bindEvent(doc.getElementById(QUEST_ELEMENT_ID.scenarioId),       'click', createListenerFunction(this.scenarioITClick, this));
	bindEvent(doc.getElementById(QUEST_ELEMENT_ID.noticeFileTaskId), 'click', createListenerFunction(this.closeNotice, this));
	bindEvent(doc.getElementById(QUEST_ELEMENT_ID.noticeNextId),     'click', createListenerFunction(this.closeNotice, this));

	this.levelFactory = new LevelFactory(this);
	this.updateUI();
};
