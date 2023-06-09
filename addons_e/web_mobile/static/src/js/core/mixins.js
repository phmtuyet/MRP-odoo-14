odoo.define('web_mobile.mixins', function (require) {
"use strict";

const session = require('web.session');
const mobile = require('web_mobile.core');

var backButtonEventListeners = [];

function onGlobalBackButton() {
    var listener = backButtonEventListeners[backButtonEventListeners.length - 1];
    if (listener) {
        listener._onBackButton.apply(listener, arguments);
    }
}

/**
 * Mixin to setup lifecycle methods and allow to use 'backbutton' events sent
 * from the native application.
 *
 * @mixin
 * @name BackButtonEventMixin
 *
 */
var BackButtonEventMixin = {
    /**
     * Register event listener for 'backbutton' event when attached to the DOM
     */
    on_attach_callback: function () {
        if (mobile.methods.overrideBackButton) {
            backButtonEventListeners.push(this);
            if (backButtonEventListeners.length === 1) {
                document.addEventListener('backbutton', onGlobalBackButton);
                mobile.methods.overrideBackButton({enabled: true});
            }
        }
    },
    /**
     * Unregister event listener for 'backbutton' event when detached from the DOM
     */
    on_detach_callback: function () {
        if (mobile.methods.overrideBackButton) {
            backButtonEventListeners = _.without(backButtonEventListeners, this);
            if (backButtonEventListeners.length === 0) {
                document.removeEventListener('backbutton', onGlobalBackButton);
                mobile.methods.overrideBackButton({enabled: false});
            }
        }
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {Event} ev 'backbutton' type event
     */
    _onBackButton: function () {},
};

/**
 * Mixin to hook into the controller record's saving method and
 * trigger the update of the user's account details on the mobile app.
 *
 * @mixin
 * @name UpdateDeviceAccountControllerMixin
 *
 */
const UpdateDeviceAccountControllerMixin = {
    /**
     * @override
     */
    async saveRecord() {
        const changedFields = await this._super(...arguments);
        this.savingDef = this.savingDef.then(() => session.updateAccountOnMobileDevice());
        return changedFields;
    },
};

/**
 * Trigger the update of the user's account details on the mobile app as soon as
 * the session is correctly initialized.
 */
session.is_bound.then(() => session.updateAccountOnMobileDevice());

return {
    BackButtonEventMixin: BackButtonEventMixin,
    UpdateDeviceAccountControllerMixin,
};

});
