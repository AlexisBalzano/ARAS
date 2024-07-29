//Notifications system

const notifications = document.getElementsByClassName('notifications')[0];
const notifSuccess = document.getElementsByClassName('success')[0];
const notifFailure = document.getElementsByClassName('failure')[0];
const notifProcessing = document.getElementsByClassName('processing')[0];

export function showNotif(options) {
    let notif;
    if (options.type === 'success') {
        notif = notifSuccess.cloneNode(true);
    } else if (options.type === 'failure') {
        notif = notifFailure.cloneNode(true);
    } else {
        notif = notifProcessing.cloneNode(true);
    }
    notif.innerHTML = options.message;
    notif.style.display = 'block';
    notifications.appendChild(notif);

    if (options.duration !== 0) {
        setTimeout(() => {
            notif.classList.add('notifOut');
            setTimeout(() => {
                notif.style.display = 'none';
                notif.remove();
            }, 99);
        }, options.duration);
    }
    return notif;
}

export function clearNotif(notif) {
    notif.classList.add('notifOut');
    setTimeout(() => {
        notifications.removeChild(notif);
    }, 99);
}