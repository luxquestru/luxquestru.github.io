var LevelFactory = Class.extend({
	app: null,

	init: function(app) {
		this.app = app;
	},

	/**
	 * Takes a response object, validates it to satisfy the Level fields and initializes this object
	 * with the new data.
	 *
	 * @param response a response object with several fields received from the backend
	 * @return {String} error string if failed validation or <tt>null</tt> otherwise
	 */
	tryInitializeFromResponse: function(response) {
		if (!response) return "Invalid response object";

		var fields = ['levelType'];

		for (var i in fields)
			if (!response[fields[i]])
				return 'Invalid ' + fields[i] + ' value [' + response[fields[i]] + ']';

		if (response.levelType != LEVEL_TYPE.quiz && response.levelType != LEVEL_TYPE.text && response.levelType != LEVEL_TYPE.file && response.levelType != LEVEL_TYPE.image)
			return 'Invalid levelType value [' + response.levelType + ']';
		if (response.levelType == LEVEL_TYPE.quiz && !(response.quiz && isArray(response.quiz)))
			return 'Invalid quiz value: not an array [' + response.quiz + ']';

		var q = {}, qCount = 0;
		for (var i in response.quiz) {
			var question = response.quiz[i];
			if (question.id && question.title && question.options && (question.type == QUESTION_TYPE.check || question.type == QUESTION_TYPE.radio)) {
				var options = {}, oCount = 0;
				for (var o in question.options) {
					var option = question.options[o];
					if (option.value && option.title) {
						options[option.value] = option.title;
						oCount++;
					}
				}
				if (oCount != 0) {
					q[question.id] = {
						title:   question.title,
						type:    question.type,
						options: options
					};
					qCount++;
				}
			}
		}
		if (qCount == 0)
			if (response.levelType == LEVEL_TYPE.quiz)
				return 'Invalid quiz value: no valid questions';
			else
				response.quiz = {};
		else
			response.quiz = q;

		switch (response.levelType) {
			case LEVEL_TYPE.quiz:  return new QuizLevel(this.app, response);
			case LEVEL_TYPE.text:  return new TextLevel(this.app, response);
			case LEVEL_TYPE.file:  return new FileLevel(this.app, response);
			case LEVEL_TYPE.image: return new ImageLevel(this.app, response);
		}
	}
});

var Level = Class.extend({
	/*
	 * inner fields
	 */
	comicsURL: '',
	levelText: '',
	levelType: '',
	quiz:      {},
	answers:   [],
	app:       null,

	/*
	 * HTML DOM Cache
	 */
	ui: {
		doc:             null,       //
		text:            null,       //
		comics:          null,       //
		fileTask:        null,       //
		textTask:        null,       //
		quizTask:        null,       //
		nextButton:      null,       //
		nextButtonBlock: null,

		// text level specific
		textInput:       null,

		// file level specific
		fileList:        null,
		dropText:        null,
		dropper:         null,
		progressbar:     null,
		bar:             null,
		progressLabel:   null,
		uploadingItem:   null,
		pendingItem:     null,
		executingItem:   null,
		outputItem:      null,
		fileTaskNotice:  null,
		nextNotice:      null
	},

	nextListener: null,
	quizListener: null,
	nextHandler:  null,

	init: function(app, response) {
		this.app = app;

		var doc = app.getDocument();
		this.ui.doc = doc;
		this.ui.comics   = doc.getElementById(QUEST_ELEMENT_ID.comicsId);
		this.ui.text     = doc.getElementById(QUEST_ELEMENT_ID.levelTextId);
		this.ui.fileTask = doc.getElementById(QUEST_ELEMENT_ID.fileTaskId);
		this.ui.textTask = doc.getElementById(QUEST_ELEMENT_ID.textTaskId);
		this.ui.quizTask = doc.getElementById(QUEST_ELEMENT_ID.quizTaskId);
		this.ui.textInput       = this.ui.textTask.getElementsByTagName('input')[0];
		this.ui.nextButton      = doc.getElementById(QUEST_ELEMENT_ID.nextButtonId);
		this.ui.nextButtonBlock = doc.getElementById(QUEST_ELEMENT_ID.nextButtonBlockId);

		this.comicsURL = response.comicsURL;
		this.levelText = response.levelText;
		this.levelType = response.levelType;
		this.quiz      = response.quiz;
		this.answers   = {};
		for(var questionId in this.quiz) this.answers[questionId] = [];
	},

	/**
	 * Removes the level from the page, undinds handlers.
	 */
	hideLevel: function() {
		if (this.quizListener) {
			unbindEvent(this.ui.quizTask, 'click', this.quizListener);
			this.quizListener = null;
		}

		if (this.nextListener) {
			unbindEvent(this.ui.nextButton, 'click', this.nextListener);
			this.nextListener = null;
		}
		this.nextHandler = null;
	},

	/**
	 * Handles click event for next button, calls {@link app.nextHandler}.
	 * @param e event object
	 */
	onNextClick: function (e) {
		this.app.onButtonClicked(e);
	},

	/**
	 * Validates if all answers are set.
	 * @return {Boolean} <tt>true</tt> by default
	 */
	validateAnswers: function() {
		return true;
	},

	/**
	 * Returns an answers
	 * @return {null} <tt>null</tt> by default
	 */
	getAnswers: function() {
		return null;
	}
});

var QuizLevel = Level.extend({
	/**
	 * Creates an html for specified question.
	 *
	 * @param questionId question id
	 * @param question question object with title, type and options
	 * @return {String} resulting HTML
	 */
	createQuestionHTML: function(questionId, question) {
		//html += '<fieldset id="q_' + questionId + '" class="' + question.type + 'group">';
		//html += '<legend>' + question.title + '</legend>';
		//html += '<ul class="' + question.type + 'list">';

		var optionsHTML = '';
		for(var i in question.options) {
			optionsHTML += fillTemplate(QUIZ_OPTION_TEMPLATE, {
				'type':  question.type == QUESTION_TYPE.check ? 'checkbox' : 'radio',
				'name':  'q_' + questionId,
				'value': i,
				'title': question.options[i]
			});
		}

		return fillTemplate(QUIZ_QUESTION_TEMPLATE, {'title': question.title, 'options': optionsHTML});
	},

	/**
	 * Displays the level on the page, binds event handlers.
	 *
	 * @param doc HTMLDocument object
	 */
	displayLevel: function() {
		this.ui.nextButton.innerHTML = LEVEL_NEXT_CAPTION[this.levelType];
		bindEvent(this.ui.nextButton, 'click', this.nextListener = createListenerFunction(this.onNextClick, this));

		this.ui.comics.innerHTML = this.comicsURL ? '<img src="' + this.comicsURL + '" alt=""/>' : '';
		this.ui.text.parentNode.parentNode.style.display = this.levelText ? 'block' : 'none';
		this.ui.text.innerHTML = this.levelText;

		// fill in the quiz element with questions
		var quizHTML = '<div class="page">';
		for(var i in this.quiz) {
			quizHTML += this.createQuestionHTML(i, this.quiz[i]);
		}
		quizHTML += '</div>';
		this.ui.quizTask.innerHTML = quizHTML;
		bindEvent(this.ui.quizTask, 'click', this.quizListener = createListenerFunction(this.onQuizClick, this));

		this.ui.fileTask.style.display = 'none';
		this.ui.textTask.style.display = 'none';
		this.ui.quizTask.style.display = 'block';
	},

	/**
	 * Stores the answer to specified question.
	 *
	 * @param questionId question id
	 * @param value selected option value
	 * @param add <tt>true</tt> to add option and <tt>false</tt> to remove. Is always <tt>true</tt> for radio options.
	 * @param radio <tt>true</tt> if it is a radio option and <tt>false</tt> otherwise
	 */
	storeAnswer: function(questionId, value, add, radio) {
		if (this.answers && this.answers[questionId]) {
			var i;
			for(i in this.answers[questionId]) if (this.answers[questionId][i] == value) break;
			if (this.answers[questionId][i] == value) {
				if (add) return; // already exists
				this.answers[questionId].splice(i, 1); // else remove
			} else {
				if (! add) return; // already has no such value
				if (radio) this.answers[questionId] = [value]; // only one value for radios
				else this.answers[questionId].push(value); // several values for checkboxes
			}
		}
	},

	/**
	 * Handles click event for quizTask div. Processes only the clicks to HTMLInputElements, storing the
	 * answer to {@link this.answers} object.
	 * @param e event object
	 */
	onQuizClick: function (e) {
		if (e.target && isHTMLObject(e.target, 'HTMLInputElement')) {
			var input = e.target;
			var ul = input.parentNode.parentNode.parentNode;
			var isRadio = input.type == 'radio';
			var checked = isRadio || (input.type == 'checkbox' && input.checked);
			// update background
			if (isRadio) {
				for(var i = ul.childNodes.length - 1; i >= 0; i--) {
					ul.childNodes[i].className = ul.childNodes[i].childNodes[0].childNodes[0] == input ? 'act' : '';
				}
			} else {
				input.parentNode.parentNode.className = checked ? 'act' : '';
			}
			this.storeAnswer(input.name.split('_')[1], input.value, checked, input.type == 'radio');
		}
	},

	/**
	 * Validates if all answers are set. For quiz: if all radiobutton groups have checked option (checkbox
	 * groups may have no options checked). For text: if a textbox has any text (excluding heading and
	 * trailing spaces). For file: ???.
	 *
	 * @return {Boolean} <tt>true</tt> if the answers might be sent to the server and <tt>false</tt> otherwise
	 */
	validateAnswers: function() {
		for(var questionId in this.answers) {
			if (this.quiz[questionId].type == QUESTION_TYPE.radio && this.answers[questionId].length == 0)
				return false;
		}
		return true;
	},

	/**
	 * Returns an answers according to the level type.
	 * @return {Array|String|null} answers array for quiz level, textbox value for text level and <tt>null</tt> for file level
	 */
	getAnswers: function() {
		return JSON.stringify(this.answers);
	}
});

var TextLevel = Level.extend({

	/**
	 * Displays the level on the page, binds event handlers.
	 *
	 * @param doc HTMLDocument object
	 */
	displayLevel: function() {
		this.ui.nextButton.innerHTML = LEVEL_NEXT_CAPTION[this.levelType];
		bindEvent(this.ui.nextButton, 'click', this.nextListener = createListenerFunction(this.onNextClick, this));

		this.ui.comics.innerHTML = this.comicsURL ? '<img src="' + this.comicsURL + '" alt=""/>' : '';
		this.ui.text.parentNode.parentNode.style.display = this.levelText ? 'block' : 'none';
		this.ui.text.innerHTML = this.levelText;
		this.ui.textInput.value = '';

		this.ui.fileTask.style.display = 'none';
		this.ui.textTask.style.display = 'block';
		this.ui.quizTask.style.display = 'none';
	},

	/**
	 * Validates if all answers are set. For quiz: if all radiobutton groups have checked option (checkbox
	 * groups may have no options checked). For text: if a textbox has any text (excluding heading and
	 * trailing spaces). For file: ???.
	 *
	 * @return {Boolean} <tt>true</tt> if the answers might be sent to the server and <tt>false</tt> otherwise
	 */
	validateAnswers: function() {
		return this.ui.textInput.value != '';
	},

	/**
	 * Returns an answers according to the level type.
	 * @return {Array|String|null} answers array for quiz level, textbox value for text level and <tt>null</tt> for file level
	 */
	getAnswers: function() {
		return this.ui.textInput.value;
	}
});

var ImageLevel = Level.extend({

	/**
	 * Displays the level on the page, binds event handlers.
	 *
	 * @param doc HTMLDocument object
	 */
	displayLevel: function() {
		this.ui.nextButton.innerHTML = LEVEL_NEXT_CAPTION[this.levelType];
		bindEvent(this.ui.nextButton, 'click', this.nextListener = createListenerFunction(this.onNextClick, this));

		this.ui.comics.innerHTML = this.comicsURL ? '<img src="' + this.comicsURL + '" alt=""/>' : '';
		this.ui.text.parentNode.parentNode.style.display = this.levelText ? 'block' : 'none';
		this.ui.text.innerHTML = this.levelText;

		this.ui.fileTask.style.display = 'none';
		this.ui.textTask.style.display = 'none';
		this.ui.quizTask.style.display = 'none';
	},

	/**
	 * Returns an answers according to the level type.
	 * @return {Array|String|null} answers array for quiz level, textbox value for text level and <tt>null</tt> for file level
	 */
	getAnswers: function() {
		return '';
	}
});

var uploader = null;

var FileLevel = Level.extend({
	output:      '',   // received program output
	file:        null, // selected file
	fileState:   FILE_STATE.none,
	statusTimer: null,
	attemptGUID: null,

	listenerInit: null,
	listenerAdded: null,
	listenerProgress: null,
	listenerError: null,
	listenerComplete: null,

	init: function(app, response) {
		this._super(app, response);

		this.ui.fileList       = this.ui.doc.getElementById(QUEST_ELEMENT_ID.fileListId);
		this.ui.dropText       = this.ui.doc.getElementById(QUEST_ELEMENT_ID.dragDropTextId);
		this.ui.dropper        = this.ui.doc.getElementById(QUEST_ELEMENT_ID.dropAreaId);
		this.ui.progressbar    = this.ui.doc.getElementById(QUEST_ELEMENT_ID.progressBarId);
		this.ui.bar            = this.ui.doc.getElementById(QUEST_ELEMENT_ID.barId);
		this.ui.progressLabel  = this.ui.doc.getElementById(QUEST_ELEMENT_ID.progressLabelId);
		this.ui.outputItem     = this.ui.doc.getElementById(QUEST_ELEMENT_ID.outputId);
		this.ui.fileTaskNotice = this.ui.doc.getElementById(QUEST_ELEMENT_ID.noticeFileTaskId);
		this.ui.nextNotice     = this.ui.doc.getElementById(QUEST_ELEMENT_ID.noticeNextId);

		if (uploader == null) {
			uploader = new plupload.Uploader({
				runtimes:      'html5,flash,html4',
				flash_swf_url: 'js/pupload/plupload.flash.swf',
				browse_button: QUEST_ELEMENT_ID.browseId,
				drop_element:  QUEST_ELEMENT_ID.dropAreaId,
				container :    QUEST_ELEMENT_ID.fileTaskId,
				url:           WEB_UPLOADER_URL,
				multipart:     true,
				max_file_size: '1mb'
			});
			uploader.bind('Init', this.listenerInit = createListenerFunction(this.uploaderInit, this));
			uploader.init();
		}

		this.ui.fileList.innerHTML = '';
		this.ui.fileList.style.display = 'none';

		uploader.bind('FilesAdded', this.listenerAdded = createListenerFunction(this.uploaderFilesAdded, this));
		uploader.bind('UploadProgress', this.listenerProgress = createListenerFunction(this.uploaderProgress, this));
		uploader.bind('Error', this.listenerError = createListenerFunction(this.uploaderError, this));
		uploader.bind('FileUploaded', this.listenerComplete = createListenerFunction(this.uploaderComplete, this));
	},

	/**
	 * Displays the level on the page, binds event handlers.
	 *
	 * @param doc HTMLDocument object
	 */
	displayLevel: function() {
		this.ui.nextButton.innerHTML = LEVEL_NEXT_CAPTION[this.levelType];
		this.ui.nextButtonBlock.style.display = 'none';
		bindEvent(this.ui.nextButton, 'click', this.nextListener = createListenerFunction(this.onNextClick, this));

		this.ui.comics.innerHTML = this.comicsURL ? '<img src="' + this.comicsURL + '" alt=""/>' : '';
		this.ui.text.parentNode.parentNode.style.display = this.levelText ? 'block' : 'none';
		this.ui.text.innerHTML = this.levelText;

		this.ui.fileTask.style.display = 'block';
		this.ui.textTask.style.display = 'none';
		this.ui.quizTask.style.display = 'none';

		this.ui.fileTaskNotice.style.display = 'block';

		this.updateState(FILE_STATE.none);
	},

	/**
	 * Removes the level from the page, undinds handlers.
	 */
	hideLevel: function() {
		this.updateState(FILE_STATE.hidden);
		uploader.unbind('FilesAdded', this.listenerAdded);
		uploader.unbind('UploadProgress', this.listenerProgress);
		uploader.unbind('Error', this.listenerError);
		uploader.unbind('FileUploaded', this.listenerComplete);
		this._super();
	},


	/**
	 * Handles click event for next button, uploads the file and waits for result.
	 * @param e event object
	 */
	onNextClick: function (e) {
		if (this.fileState == FILE_STATE.complete)
			this._super(e);
		else {
			this.upload(this.app.getSID());
			e.preventDefault();
		}
	},

	updateUI: function() {
		var state = this.fileState;

		if (state == FILE_STATE.complete || state == FILE_STATE.error) {
			this.stopStatusRequester();
		}

		this.ui.nextButtonBlock.style.display = state == FILE_STATE.selected || state == FILE_STATE.hidden ||
			state == FILE_STATE.complete || state == FILE_STATE.error ? 'block' : 'none';
		this.ui.dropper.style.display = state == FILE_STATE.none || state == FILE_STATE.selected ||
			state == FILE_STATE.error ? 'block' : 'none';
		this.ui.progressbar.style.display = state == FILE_STATE.uploading || state == FILE_STATE.pending ||
			state == FILE_STATE.executing ? 'block' : 'none';
		this.ui.bar.style.display = state == FILE_STATE.uploading || state == FILE_STATE.pending ||
			state == FILE_STATE.executing ? 'block' : 'none';
		if (state == FILE_STATE.hidden) {
			this.ui.fileTaskNotice.style.display = 'none';
			this.ui.nextNotice.style.display = 'none';
		}

		if (state == FILE_STATE.complete || state == FILE_STATE.error) {
			this.ui.nextNotice.style.display = 'block';
			this.ui.nextNotice.className = state == FILE_STATE.error ? 'notice error' : 'notice complete';
			this.ui.nextNotice.childNodes[0].innerHTML = FILE_TASK_NOTICES[state];
		}

		if (this.output) {
			this.ui.outputItem.innerHTML = this.output;
			this.ui.outputItem.style.display = 'block';
		} else {
			this.ui.outputItem.style.display = 'none';
		}

		switch (state) {
			case FILE_STATE.uploading:
				this.ui.bar.style.width = '25%';
				break;

			case FILE_STATE.pending:
				this.ui.bar.style.width = '50%';
				break;

			case FILE_STATE.executing:
				this.ui.bar.style.width = '75%';
				break;
		}

		this.ui.progressLabel.innerHTML = FILE_TASK_PROGRESS[state] ? FILE_TASK_PROGRESS[state] : '';
	},

	/**
	 * Sets file state and updates UI.
	 * @param state
	 */
	updateState: function(state) {
		//console.log('Update state: ' + state);
		this.fileState = state;
		this.updateUI();
	},

	upload: function(guid) {
		if (this.fileState == FILE_STATE.selected || this.fileState == FILE_STATE.error)
		{
			this.updateState(FILE_STATE.uploading);
			this.attemptGUID = '';
			/*
			 * Resetting file state. If the file was failed to upload, then pluploader is unable to make one more attempt
			 * (may be it is a bug), uploader simply ignores start() method call. But if reset the file state, then it
			 * is possible to resend the file without selecting it once again in a dialog.
			 */
			this.file.status  = plupload.QUEUED;
			this.file.loaded  = 0;
			this.file.percent = 0;
			uploader.settings.url = WEB_UPLOADER_URL + '?sid=' + this.app.getSID() + '&scenario=' + this.app.getScenario();
			uploader.start();
		}
	},

	/*
	 * File uploader listeners
	 */

	uploaderInit: function(up, params) {
		this.ui.dropText.style.display = up.features.dragdrop ? 'inline' : 'none';
	},

	uploaderFilesAdded: function(up, files) {
		if (files.length == 0) return; // skip if no files selected

		// quest application only supports single files upload
		// remove other files from the list if several were selected
		if (files.length > 1) uploader.splice(1, files.length - 1);
		this.file = files[0];

		this.updateState(FILE_STATE.selected);
		$(this.ui.nextButton).scrollTo(800);
		this.ui.fileList.innerHTML = '<div id="' + this.file.id + '">' + this.file.name + '</div>';
		this.ui.fileList.style.display = 'block';
		up.refresh();
	},

	uploaderProgress: function(up, file) {
		var displayPercents = (!file.percent || file.percent < 100);
		this.ui.fileList.innerHTML = '<div id="' + file.id + '">' + file.name + (displayPercents ? ' (' + file.percent + '%)' : '') + '</div>';
	},

	uploaderError: function(up, err) {
		console.log(err);

		// switch to selected state and show an error in a dialog box
		this.updateState(FILE_STATE.selected);

		//TODO: add fileupload error dialog call
		/*$('#filelist').append("<div>Error: " + err.code +
		 ", Message: " + err.message +
		 (err.file ? ", File: " + err.file.name : "") +
		 "</div>"
		 );
		 */

		up.refresh();
	},

	uploaderComplete: function(up, file, response) {
		//console.log(response);
		if (response.response) {
			var resp = JSON.parse(response.response);
			//console.log(resp);
			if (resp.ErrorCode == 0 && resp.Message && resp.Message.attemptId) {
				this.attemptGUID = resp.Message.attemptId;
				this.updateState(FILE_STATE.pending);
				this.startStatusRequester();
			} else {
				this.updateState(FILE_STATE.error);
			}
		}
		// TODO: if server doesnt response for some period call the onError handler
	},

	startStatusRequester: function() {
		this.statusTimer = setTimeout(createListenerFunction(this.startStatusRequester, this), 5000);
		$.getJSON(
			WEB_EXECUTION_STATUS,
			{
				sid: this.app.getSID(),
				attempt: this.attemptGUID
			},
			createListenerFunction(this.handleResponse, this)
		);
	},

	stopStatusRequester: function() {
		if (this.statusTimer) {
			clearTimeout(this.statusTimer);
			this.statusTimer = null;
		}
	},

	handleResponse: function(data, textStatus) {
		if (textStatus == 'success') {
			if (data.ErrorCode != 0) {
				this.updateState(FILE_STATE.error);
				return;
			}

			data = data.Message;

			if (data.output) {
				this.output = decodeURIComponent(data.output);
			}

			if (data.status) {
				if (data.status == 'pending') this.updateState(FILE_STATE.pending);
				else if (data.status == 'publishing') this.updateState(FILE_STATE.pending);
				else if (data.status == 'scheduled') this.updateState(FILE_STATE.pending);
				else if (data.status == 'running') this.updateState(FILE_STATE.executing);
				else if (data.status == 'done' && data.level) this.updateState(FILE_STATE.complete);
				else this.updateState(FILE_STATE.error);
			}

			// let application to process the rest of the data
			if (data.level) {
				//console.log('has level data');
				//console.log('this.fileState is ' + this.fileState);
				this.app.handleResponse(data.level);
			} else {
				if (this.fileState == FILE_STATE.complete || this.fileState == FILE_STATE.error) {
					this.updateUI();
				}
			}

			$(this.ui.nextNotice).scrollTo(800);
		}
	}
});

