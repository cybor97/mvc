const childProcess = require('child_process');
const https = require('https');
const axios = require('axios');
const FormData = require('form-data');
const qs = require('querystring');
const IController = require('./IController');
const Logger = require('../utils/Logger');
const config = require('../config');

const DBConnection = require('../data');

class VKBotController extends IController {
    async init() {
        this.axios = axios.create({
            timeout: 10000,
            httpsAgent: new https.Agent({ keepAlive: true })
        });
        this.models = DBConnection.models;

        if (!config.vk || !config.vk.groupId || !config.vk.secret) {
            Logger.err('VKBotController.init VK unconfigured');
        }
        else {
            if (!config.restartNotifyDisabled) {
                await new Promise(resolve => childProcess.exec('git log --oneline -1', (err, stdout) => this.notifyAdmins('restart', `Restarted!\nLast commit: ${err || stdout}`).then(resolve)));
            }
        }

        return this;
    }

    async callback(params) {
        Logger.info(`VKBotController.callback type:${params.type} group_id:${params.group_id}`);
        if (!config.vk || !config.vk.groupId || !config.vk.secret) {
            return { status: 500, data: { message: 'VK unconfigured' } };
        }
        if (params.secret != config.vk.secret) {
            return { status: 401, data: { message: 'Unauthorized' } };
        }

        switch (params.type) {
            case 'confirmation':
                if (params.group_id !== config.vk.groupId) {
                    return { status: 400, data: { message: 'Invalid group' } };
                }
                return { status: 200, data: '69084f94', dataOnly: true };

            case 'group_join':
                let { user_id } = params.object;
                let user = await this.models.User.getByVkId(user_id);
                if (!user) {
                    await this.handleNewUser(user_id);
                }
                break;
            case 'group_leave':
                await this.sendMessage(params.object.user_id, 'cybor97_mvc Leave');
                break;
            case 'message_new':
            case 'message_reply':
                await this.handleMessage(params.object.message.from_id, params.object.message.text, params.object.message.payload);
                break;

            default:
                return { status: 400, data: { message: 'Invalid request' } };

        }
        return { status: 200, data: 'ok', dataOnly: true };
    }

    async handleMessage(userId, message, payload) {
        let user = await this.models.User.getByVkId(userId);

        if (config.vk.admins && config.vk.admins[userId.toString()] && message && message.match(/\/[a-z]*/)) {
            return this.handleAdminMenu(userId, user, message);
        }

        let startPhrase = await this.getPhrase('start') || 'Start';
        if (!user) {
            await this.handleNewUser(userId, message === startPhrase);
        }

        if (user || message === startPhrase) {
            if (!user) {
                user = await this.models.User.getByVkId(userId);
            }
            return this.handleUserRequest(userId, user, message, payload);
        }
    }

    async handleUserRequest(userId, user, message, payload) {
        payload = payload ? typeof (payload) === 'string' ? JSON.parse(payload).button : payload.button : undefined;

        if (!user.grade && !user.context) {
            let chooseClass = await this.getPhrase('chooseClass') || 'Choose class';
            let classNumberKeyboard = (await this.models.Book.getClassNumbers()).filter(Boolean).map(classNumber => ([classNumber.toString()]));

            if (await this.sendMessage(userId, chooseClass, await this.getKeyboard(classNumberKeyboard))) {
                user.context = 'chooseClass';
                return await user.save();
            }

            await user.save();
        }

        if (!user.context) {
            if (user.grade) {
                user.context = 'chooseSubject';
                user.subject = null;
            }
            else {
                //Start from beginning
                user.context = 'chooseClass';
            }
        }

        let backPhrase = await this.getPhrase('back') || 'Back';
        let resetPhrase = await this.getPhrase('reset') || 'Reset';
        let keysDefault = [[{ label: backPhrase, color: 'negative', payload: JSON.stringify({ button: 'back' }) }, { label: resetPhrase, color: 'negative', payload: JSON.stringify({ button: 'reset' }) }]];


        if (message === resetPhrase) {
            user.context = 'chooseClass';
            user.grade = null;
            await user.save();
        }

        if (message === backPhrase) {
            //TODO: Review
            //Works via cludge as back guaranteed won't result to same or forward item 
            let contexts = ['chooseClass', 'chooseSubject', 'chooseBook', /choosePage|chooseSection/];
            let contextIndex = contexts.findIndex(c => user.context.match(c));
            if (contextIndex > 0) {
                user.context = contexts[contextIndex - 1];
            }
            await user.save();
        }

        if (user.context) {
            switch (user.context) {
                case 'chooseClass': {
                    if (!message || !(await this.models.Book.checkClass(message))) {
                        let classNumberKeyboard = (await this.models.Book.getClassNumbers()).filter(Boolean).map(classNumber => ([classNumber.toString()]));
                        let chooseClass = await this.getPhrase('chooseClass') || 'Choose class';

                        return await this.sendMessage(userId, chooseClass, await this.getKeyboard(classNumberKeyboard));
                    }

                    user.grade = message;
                    user.context = 'chooseSubject';

                    let chooseSubject = await this.getPhrase('chooseSubject') || 'Choose subject';
                    let chooseSubjectKeyboard = (await this.models.Book.getSubjects(user.grade)).filter(Boolean).map(subject => ([subject]));
                    await this.sendMessage(userId, chooseSubject, await this.getKeyboard(chooseSubjectKeyboard.concat(keysDefault)));

                    await user.save();
                    break;
                }
                case 'chooseSubject': {
                    if (message === backPhrase || !message || !(await this.models.Book.checkSubject(user.grade, message))) {
                        let chooseSubjectKeyboard = (await this.models.Book.getSubjects(user.grade)).filter(Boolean).map(subject => ([subject]));

                        if (message === backPhrase) {
                            let chooseSubject = await this.getPhrase('chooseSubject') || 'Choose subject';
                            return await this.sendMessage(userId, chooseSubject, await this.getKeyboard(chooseSubjectKeyboard.concat(keysDefault)));
                        }

                        let subjectNotFound = await this.getPhrase('subjectNotFound') || 'Subject not found';
                        return await this.sendMessage(userId, subjectNotFound, await this.getKeyboard(chooseSubjectKeyboard.concat(keysDefault)));
                    }

                    if (!user.path) {
                        user.path = {};
                    }

                    user.path = Object.assign(user.path, { subject: message });
                    user.context = 'chooseBook';

                    let chooseBook = await this.getPhrase('chooseBook') || 'Choose book';
                    let chooseBookKeyboard = (await this.models.Book.getBooks(user.grade, user.path.subject)).filter(Boolean).map(book => ([book.slice(null, 40)]));

                    if (await this.sendMessage(userId, chooseBook, await this.getKeyboard(chooseBookKeyboard.concat(keysDefault)))) {
                        await user.save();
                    }
                    break;
                }
                case 'chooseBook': {
                    let book = await this.models.Book.getBook(user.grade, user.path.subject, message);
                    if (message === backPhrase || !message || !book) {
                        let chooseBookKeyboard = (await this.models.Book.getBooks(user.grade, user.path.subject)).filter(Boolean).map(book => ([book.slice(null, 40)]));
                        if (message === backPhrase) {
                            let chooseBook = await this.getPhrase('chooseBook') || 'Choose book';
                            return await this.sendMessage(userId, chooseBook, await this.getKeyboard(chooseBookKeyboard.concat(keysDefault)));
                        }

                        let bookNotFound = await this.getPhrase('bookNotFound') || 'Book not found';
                        return await this.sendMessage(userId, bookNotFound, await this.getKeyboard(chooseBookKeyboard.concat(keysDefault)));
                    }


                    let bookPagesInfo = await this.models.BookPage.getBookPagesInfo(book.id);

                    let bookFound = await this.getPhrase('bookFound') || 'Book found';

                    let fromPhrase = await this.getPhrase('from') || 'From';
                    let toPhrase = await this.getPhrase('to') || 'To';

                    if (user.path.bookId !== book.id && await this.sendMessage(userId, `${bookFound}\n${book.name}\n${book.url}`)) {
                        user.path = Object.assign(user.path, { bookId: book.id });

                        //TODO: Move in different func with different condition
                        if (bookPagesInfo.pagesCount) {
                            let range = await this.models.BookPage.getRange(user.path.bookId, 'page');
                            let choosePage = await this.getPhrase('choosePage') || 'Choose page';
                            user.context = 'choosePage';
                            await user.save();
                            return await this.sendMessage(userId, `${choosePage} ${fromPhrase} ${range.from} ${toPhrase} ${range.to}`, await this.getKeyboard(keysDefault));
                        }
                        else if (bookPagesInfo.bookPartsCount || bookPagesInfo.paragraphsCount || bookPagesInfo.sectionRootsCount || bookPagesInfo.sectionsCount) {
                            let partsRanges = {};
                            let phrases = {};
                            if (bookPagesInfo.bookPartsCount) {
                                partsRanges['bookPart'] = await this.models.BookPage.getRange(user.path.bookId, 'bookPart');
                                phrases['bookPart'] = await this.getPhrase('chooseBookPart');
                            }
                            if (bookPagesInfo.paragraphsCount) {
                                partsRanges['paragraph'] = await this.models.BookPage.getRange(user.path.bookId, 'paragraph');
                                phrases['paragraph'] = await this.getPhrase('chooseParagraph');
                            }
                            if (bookPagesInfo.sectionRootsCount) {
                                partsRanges['sectionRoot'] = await this.models.BookPage.getRange(user.path.bookId, 'sectionRoot');
                                phrases['sectionRoot'] = await this.getPhrase('chooseSectionRoot');
                            }
                            if (bookPagesInfo.sectionsCount) {
                                partsRanges['section'] = await this.models.BookPage.getRange(user.path.bookId, 'section');
                                phrases['section'] = await this.getPhrase('chooseSection');
                            }
                            for (let part in partsRanges) {
                                let chooseRangePhrase = phrases[part];
                                let range = partsRanges[part];
                                user.context = 'chooseSection';
                                user.path = Object.assign(user.path, { part });
                                await user.save();
                                return await this.sendMessage(userId, `${chooseRangePhrase} ${fromPhrase} ${range.from} ${toPhrase} ${range.to}`, await this.getKeyboard(keysDefault));
                            }
                        }
                    }

                    if (config.vk.admins && config.vk.admins[userId.toString()]) {
                        await this.sendMessage(userId, `cybor97_mvc Admin info: Book parts: ${bookPagesInfo.bookPartsCount} Paragraphs: ${bookPagesInfo.paragraphsCount} Section roots: ${bookPagesInfo.sectionRootsCount} Sections: ${bookPagesInfo.sectionsCount} Pages ${bookPagesInfo.pagesCount}`, await this.getKeyboard(keysDefault));
                    }

                    break;
                }
                case 'choosePage': {
                    if (!user.path.bookId) {
                        user.context = 'chooseBook';
                        return await this.handleUserRequest(userId, user, message);
                    }

                    let bookPage = await this.models.BookPage.getByPage(user.path.bookId, message);
                    if (!message || !bookPage) {
                        let bookPageNotFound = await this.getPhrase('bookPageNotFound') || 'Book page not found';
                        return await this.sendMessage(userId, bookPageNotFound, await this.getKeyboard(keysDefault));
                    }

                    let attachment = undefined;

                    try {
                        let bookPageImageResp = await axios.get(bookPage.imageUrl, { responseType: 'stream' });
                        let getUploadServerResp = await axios.get(`${config.vkApiUrl}/photos.getMessagesUploadServer`, { params: { peer_id: userId, access_token: config.vk.accessToken, v: '5.103' } });

                        let formData = new FormData();
                        formData.append('photo', bookPageImageResp.data);
                        const formHeaders = formData.getHeaders();
                        let uploadServerResp = await axios.post(getUploadServerResp.data.response.upload_url, formData, { headers: { ...formHeaders } });

                        let saveMessagesPhotoResp = await axios.get(`${config.vkApiUrl}/photos.saveMessagesPhoto`, { params: Object.assign(uploadServerResp.data, { peer_id: userId, access_token: config.vk.accessToken, v: '5.103' }) });

                        attachment = `photo${userId}_${saveMessagesPhotoResp.data.response.pop().id}`;
                    } catch (err) {
                        Logger.err('VKBotController.handleUserRequest choosePage', err);
                    }

                    return await this.sendMessage(userId, `${bookPage.textData}${attachment || !bookPage.imageUrl || !bookPage.imageUrl.trim().length ? '' : `\n${bookPage.imageUrl}`}\n${bookPage.url}`, await this.getKeyboard(keysDefault), attachment);
                }
                case 'chooseSection': {
                    let bookPage = await this.models.BookPage.getByPart(user.path.bookId, user.path.part, message);
                    if (!message || !bookPage) {
                        let bookPageNotFound = await this.getPhrase('bookPageNotFound') || 'Book page not found';
                        return await this.sendMessage(userId, bookPageNotFound, await this.getKeyboard(keysDefault));
                    }
                    user.path = Object.assign(user.path, { [user.path.part]: message });

                    let bookPagesInfo = await this.models.BookPage.getBookPagesInfo(user.path.bookId);
                    let partsRanges = {};
                    if (bookPagesInfo.bookPartsCount) {
                        partsRanges['bookPart'] = {
                            range: await this.models.BookPage.getRange(user.path.bookId, 'bookPart'),
                            phrase: await this.getPhrase('chooseBookPart') || 'Choose book part',
                            count: bookPagesInfo.bookPartsCount
                        };
                    }
                    if (bookPagesInfo.paragraphsCount) {
                        partsRanges['paragraph'] = {
                            range: await this.models.BookPage.getRange(user.path.bookId, 'paragraph'),
                            phrase: await this.getPhrase('chooseParagraph') || 'Choose paragraph',
                            count: bookPagesInfo.paragraphsCount
                        };
                    }
                    if (bookPagesInfo.sectionRootsCount) {
                        partsRanges['sectionRoot'] = {
                            range: await this.models.BookPage.getRange(user.path.bookId, 'sectionRoot'),
                            phrase: await this.getPhrase('chooseSectionRoot') || 'Choose section root',
                            count: bookPagesInfo.sectionRootsCount
                        };
                    }
                    if (bookPagesInfo.sectionsCount) {
                        partsRanges['section'] = {
                            range: await this.models.BookPage.getRange(user.path.bookId, 'section'),
                            phrase: await this.getPhrase('chooseSection') || 'Choose section',
                            count: bookPagesInfo.sectionsCount
                        };
                    }
                    for (let part in partsRanges) {
                        if (user.part != part && !user.path[part]) {
                            let chooseRangePhrase = partsRanges[part].phrase;
                            let fromPhrase = await this.getPhrase('from') || 'From';
                            let toPhrase = await this.getPhrase('to') || 'To';

                            let range = partsRanges[part].range;
                            user.context = 'chooseSection';
                            user.path = Object.assign(user.path, { part });

                            await user.save();

                            let keyboard = [];
                            console.log('count', partsRanges[part].count);
                            if (partsRanges[part].count < 10) {
                                let partValues = await this.models.BookPage.getPartValues(user.path.bookId, part);
                                console.log('partValues', partValues);
                                keyboard = partValues.map(c => ([c]));
                            }

                            return await this.sendMessage(userId, `${chooseRangePhrase} ${fromPhrase} ${range.from} ${toPhrase} ${range.to}`, await this.getKeyboard(keyboard.concat(keysDefault)));
                        }
                    }

                    let bookPageWhereParams = {};
                    for (let part in partsRanges) {
                        bookPageWhereParams[part] = user.path[part];
                    }


                    bookPage = await this.models.BookPage.getByPath(user.path.bookId, bookPageWhereParams);
                    if (!message || !bookPage) {
                        let bookPageNotFound = await this.getPhrase('bookPageNotFound') || 'Book page not found';
                        return await this.sendMessage(userId, bookPageNotFound, await this.getKeyboard(keysDefault));
                    }

                    let attachment = undefined;

                    try {
                        let bookPageImageResp = await axios.get(bookPage.imageUrl, { responseType: 'stream' });
                        let getUploadServerResp = await axios.get(`${config.vkApiUrl}/photos.getMessagesUploadServer`, { params: { peer_id: userId, access_token: config.vk.accessToken, v: '5.103' } });

                        let formData = new FormData();
                        formData.append('photo', bookPageImageResp.data);
                        const formHeaders = formData.getHeaders();
                        let uploadServerResp = await axios.post(getUploadServerResp.data.response.upload_url, formData, { headers: { ...formHeaders } });

                        let saveMessagesPhotoResp = await axios.get(`${config.vkApiUrl}/photos.saveMessagesPhoto`, { params: Object.assign(uploadServerResp.data, { peer_id: userId, access_token: config.vk.accessToken, v: '5.103' }) });

                        attachment = `photo${userId}_${saveMessagesPhotoResp.data.response.pop().id}`;
                    } catch (err) {
                        Logger.err('VKBotController.handleUserRequest choosePage', err);
                    }

                    return await this.sendMessage(userId, `${bookPage.textData}${attachment || !bookPage.imageUrl || !bookPage.imageUrl.trim().length ? '' : `\n${bookPage.imageUrl}`}\n${bookPage.url}`, await this.getKeyboard(keysDefault), attachment);
                }
            }
        }
    }

    async handleAdminMenu(userId, user, message) {
        let adminCommand = message.toLowerCase().split(' ').shift();
        switch (adminCommand) {
            case '/help':
                return await this.sendMessage(userId, 'Commands for admin', await this.getKeyboard([
                    [{ label: '/help', color: 'positive' }],
                    ['/list-phrase', '/set-phrase', { label: '/drop-phrase', color: 'negative' }],
                    ['/get-context', '/get-class'],
                    [{ label: '/drop-context', color: 'negative' }, { label: '/drop-class', color: 'negative' }, { label: '/drop-path', color: 'negative' }],
                ]));
            case '/list-phrase':
                let phrases = await this.models.Phrase.model.findAll({ attributes: ['key', 'value'] });
                return await this.sendMessage(userId, phrases.reduce((prev, next) => prev + `${next.key}: ${next.value}\n`, '').trim() || 'cybor97_mvc No phrases found!');
            case '/set-phrase': {
                let [, key, value] = message.split(/[ \n\r\t]/);
                if (key && value) {
                    value = message.split(' ').slice(2).join(' ');
                    await this.models.Phrase.model.upsert({ key, value });
                    return await this.sendMessage(userId, `${key}: ${value}`);
                }
                return await this.sendMessage(userId, 'cybor97_mvc specify key and value!');
            }
            case '/drop-phrase': {
                let [, key] = message.split(' ');
                if (key) {
                    await this.models.Phrase.model.destroy({ where: { key } });
                    return await this.sendMessage(userId, `-${key}`);
                }
                return await this.sendMessage(userId, 'cybor97_mvc specify key!');
            }
            case '/get-class': {
                return await this.sendMessage(userId, user ? user.grade ? user.grade : 'No user class' : 'No user stored');
            }

            case '/get-context': {
                return await this.sendMessage(userId, user ? user.context ? user.context : 'No user context' : 'No user stored');
            }
            case '/drop-context': {
                await this.sendMessage(userId, user ? user.context ? `-${user.context}` : 'No user context' : 'No user stored');
                if (user) {
                    user.context = null;
                    await user.save();
                }
                break;
            }
            case '/drop-class': {
                await this.sendMessage(userId, user ? user.grade ? `-${user.grade}` : 'No grade' : 'No user stored');
                if (user) {
                    user.grade = null;
                    await user.save();
                }
                break;
            }
            case '/drop-path': {
                await this.sendMessage(userId, user ? user.path ? `-${user.path}` : 'No path' : 'No user stored');
                if (user) {
                    user.path = null;
                    await user.save();
                }
                break;
            }
        }

    }

    async handleNewUser(userId) {
        let welcome = await this.getPhrase('welcome');
        if (welcome) {
            if (await this.sendMessage(userId, welcome)) {
                let firstname = null, lastname = null;
                let { data } = await this.axios.get(`${config.vkApiUrl}/users.get`, {
                    params: {
                        user_ids: userId,
                        name_case: 'Nom',
                        v: '5.103',
                        access_token: config.vk.accessToken
                    }
                });

                if (data && data.response && data.response.length) {
                    data = data.response.pop();
                    firstname = data.first_name;
                    lastname = data.last_name;
                }
                await this.models.User.model.findOrCreate({ defaults: { vkUserId: userId, firstname, lastname }, where: { vkUserId: userId } });
            }
        }
    }

    async getKeyboard(buttonsRows) {
        return {
            inline: false,
            one_time: false,
            buttons: buttonsRows.map(keys => keys.map(key => ({ action: { type: key.type || 'text', label: typeof (key) === 'string' ? key : key.label, payload: key.payload }, color: key.color || 'primary' })))
        }
    }

    async getPhrase(phraseName) {
        let phrase = await this.models.Phrase.getPhrase(phraseName);
        if (!phrase) {
            await this.notifyAdmins(`no_${phraseName}`, `Phrase for "${phraseName}" not found, please set via /set-phrase ${phraseName} SomePhrase!`)
        }

        return phrase;
    }

    async sendMessage(userId, message, keyboard, attachment) {
        let { data } = await this.axios.post(`${config.vkApiUrl}/messages.send`, qs.stringify({
            message: message,
            access_token: config.vk.accessToken
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            params: {
                random_id: parseInt(Math.random().toString().split('.').pop()),
                peer_id: userId,
                keyboard: keyboard,
                attachment: attachment,
                v: '5.103',
            }
        });

        if (data.error) {
            Logger.err(`VKBotController Sending message to ${userId} failed`, data);
            return false;
        }

        return true;
    }

    async notifyAdmins(type, message) {
        if (config.vk.admins && Object.keys(config.vk.admins).length) {
            for (let adminId in config.vk.admins) {
                Logger.info(`VKBotController.init Sending ${type} notification to admin ${config.vk.admins[adminId]} (${config.vkCommonUrl}/id${adminId})`);
                await this.sendMessage(adminId, `cybor97_mvc ${message}`);
            }
        }
        else {
            Logger.err(`Failed to notify no-any-admins, type "${type}", message "${message}"`);
        }
    }
}

module.exports = VKBotController;