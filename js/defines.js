/**
 * The root of the luxquest site
 * @type {String}
 */

var WEB_ROOT = 'http://83.166.241.9:8080/Service.svc/';
var WEB_CLIENTS_SERVICE_ROOT = WEB_ROOT + "IClientService/";
var WEB_UPLOADER_URL = WEB_ROOT + 'CheckResults';
var WEB_AUTHORIZE = WEB_CLIENTS_SERVICE_ROOT + 'Login';
var WEB_REGISTER_1 = WEB_CLIENTS_SERVICE_ROOT + 'Register';
var WEB_REGISTER_2 = WEB_CLIENTS_SERVICE_ROOT + 'Register';
var WEB_SESSION_VERIFY = WEB_CLIENTS_SERVICE_ROOT + 'VerifySessionId';

var WEB_GET_LATEST_LEVEL = WEB_CLIENTS_SERVICE_ROOT + 'GetLatestLevel';
var WEB_EXECUTION_STATUS = WEB_CLIENTS_SERVICE_ROOT + 'CheckAttemptStatus';
var WEB_CHECK_RESULT     = WEB_CLIENTS_SERVICE_ROOT + 'CheckResults';

/**
 * HTML elements id's used in {@link Level.displayLevel} and other places
 * @type {Object}
 */
var QUEST_ELEMENT_ID = {
	comicsId:            'comics',
	levelTextId:         'levelText',
	fileTaskId:          'fileTask',
	textTaskId:          'textTask',
	quizTaskId:          'quizTask',
	nextButtonId:        'nextButton',
	nextButtonBlockId:   'nextButtonBlock',
	dropAreaId:          'dropper',
	browseId:            'pickfiles',
	dragDropTextId:      'dragdropText',
	fileListId:          'filelist',
	progressBarId:       'progressbar',
	barId:               'bar',
	progressLabelId:     'progressLabel',
	outputId:            'output',
	overlayId:           'TB_overlay',
	popupAuthId:         'popup_auth',
	popupAuthCloseId:    'popup_auth_close',
	popupAuthLoginId:    'popup_auth_login',
	popupAuthPassId:     'popup_auth_pass',
	popupAuthSubmitId:   'popup_auth_submit',

    heroArea:            'hero_backgr',
	popupRegId:          'popup_reg',
	popupRegNameId:      'popup_reg_name',
    popupRegEmailId:     'popup_reg_email',
    popupRegPassId:      'popup_reg_pass',
	popupRegJobId:       'popup_reg_job',
	popupRegSpecialId:   'popup_reg_special',
    popupRegPhoneId:     'popup_reg_phone',
	popupRegCloseId:     'popup_reg_close',
	popupRegCodeBlockId: 'popup_reg_codeblock',
	popupRegCodeId:      'popup_reg_code',
	popupRegSubmitId:    'popup_reg_submit',
	startScreenId:       'screen_start',
	scenariosId:         'screen_start_scenarios',
	scenarioId:          'start_screen_scenario',
	gameScreenId:        'screen_game',
	levelHistoryListId:  'screen_game_thumblist',
	noticeFileTaskId:    'fileTaskNotice',
	noticeNextId:        'nextNotice',
	headerAuthBlockId:   'header_auth',
	headerUserBlockId:   'header_user',
    headerUserValue:     'header_user_value',
	headerUserAreaId:    'header_user_area',
	headerLoginId:       'header_auth_login',
	headerRegisterId:    'header_auth_reg',
	headerLogoutId:      'header_user_logout'
};

/**
 * Level types to be used in json from the backend
 * @type {Object}
 */
var LEVEL_TYPE = {
	image: 'image',
	quiz:  'quiz',
	text:  'text',
	file:  'app'
};

/**
 * Question types to be used in json from the backend
 * @type {Object}
 */
var QUESTION_TYPE = {
	check: 'check',
	radio: 'radio'
};

var LEVEL_NEXT_CAPTION = {};
LEVEL_NEXT_CAPTION['complete']       = 'Продолжить';
LEVEL_NEXT_CAPTION[LEVEL_TYPE.image] = 'Далее';
LEVEL_NEXT_CAPTION[LEVEL_TYPE.quiz]  = 'Далее';
LEVEL_NEXT_CAPTION[LEVEL_TYPE.file]  = 'Запустить';
LEVEL_NEXT_CAPTION[LEVEL_TYPE.text]  = 'Ответить';

var FILE_STATE = {
	hidden:     'hidden',     // all elements 'cept output are hidden
	none:       'none',       // no state
	selected:   'selected',   // user selected the file to upload
	uploading:  'uploading',  // upload in progress
	pending:    'pending',    // file is uploaded, backend prepares to execute
	executing:  'executing',  // execution in progress
	complete:   'complete',   // done successfully
	error:      'error'       // other error
};

var QUEST_STATE = {
	authorization:     'unlogged',
	scenarioSelection: 'scenario',
	playing:           'playing'
};

var QUIZ_QUESTION_TEMPLATE = '			<div class="cnt-item">\
	<fieldset>\
		<legend class="question">\
			<div class="question-in">{!title!}</div>\
		</legend>\
		<ul class="answer">{!options!}</ul>\
	</fieldset>\
	</div>\
	<div class="inner-small">&nbsp;</div>';

var QUIZ_OPTION_TEMPLATE = '<li><label><input type="{!type!}" name="{!name!}" value="{!value!}">{!title!}</label></li>';

var FILE_TASK_NOTICES = {};
FILE_TASK_NOTICES[FILE_STATE.complete] = 'Поздравляем, программа отработала правильно. Можете переходить к следующему уровню.';
FILE_TASK_NOTICES[FILE_STATE.error]    = 'Программа не прошла проверку. Изучите логи, исправьте ошибки и попробуйте снова.';

var FILE_TASK_PROGRESS = {};
FILE_TASK_PROGRESS[FILE_STATE.uploading] = 'Отправка программы';
FILE_TASK_PROGRESS[FILE_STATE.pending]   = 'Ожидание очереди';
FILE_TASK_PROGRESS[FILE_STATE.executing] = 'Выполнение';
