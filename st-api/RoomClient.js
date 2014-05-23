"use strict";

export class RoomClient {

    constructor(fbUrl) {
        this.rootRef = new Firebase(fbUrl);

        this.user = null;

        // Setup Firebase authentication.
        // This will automatically authenticate if the user's session cookie
        // is still valid. The callback will also fire whenever a user
        // tries to log in.
        this.fbAuth = new FirebaseSimpleLogin(this.rootRef, this.authenticate.bind(this));
    }

    authenticate(error, user) {
        if (error) {
            // an error occurred while attempting login
            console.log(error);

            this._loginReject && this._loginReject();
        } else {
            if (user) {
                // user authenticated with Firebase
                console.log('User ID: ' + user.uid + ', Provider: ' + user.provider);
            }
            else {
                // user is logged out
                console.log('Logged out.');
            }

            this.user = user;
            this._loginResolve && this._loginResolve(user);
        }
    }

    // Because the FirebaseSimpleLogin authenticate() callback is registered outside
    // of calls to login() or logout(), we store the resolve/reject callbacks for login()
    // and logout() in the client object and later access them during authenticate().

    loginAsGuest() {
        return new Promise((resolve, reject) => {
            this._loginResolve = resolve;
            this._loginReject = reject;

            this.fbAuth.login('anonymous');
        });
    }

    logout() {
        return new Promise((resolve, reject) => {
            this._loginResolve = resolve;
            this._loginReject = reject;

            this.fbAuth.logout();
        });
    }

    join(roomName) {
        if (!roomName) {
            this.err('join expects a roomname argument');
            return;
        }

        if (!this.user) {
            this.err('you must be logged in to join a room');
            // perhaps automatically authenticate as anonymous?
            // or just provide a log in as guest button?
            return;
        }

        return new Promise((resolve, reject) => {
            var presenceRef = this.rootRef.child('rooms/'+roomName+'/state/activeMembers').push({
                user: this.user,
                timeJoined: Firebase.ServerValue.TIMESTAMP
            }, (err) => {
                if (err) {
                    reject(err);
                } else {
                    // store the fb reference to the room state
                    this.roomRef = this.rootRef.child('rooms/'+roomName+'/state');
                    resolve();
                }
            });

            presenceRef.onDisconnect().remove();
        });
    }

    leave() {
        // todo
    }

    getFbRef(path) {
        if (!this.roomRef) {
            this.err('you need to join a room before you can getFbRef');
            return;
        }
        
        if (!path) {
            return this.roomRef;
        }

        return this.roomRef.child(path);
    }

    getRoomName() {
        return this.roomRef && this.roomRef.parent().name();   
    }

    isLoggedIn() {
        return this.user;
    }

    isInARoom() {
        return this.roomRef;
    }

    err(message) {
        console.log('RoomClient: '+message);
    }

}