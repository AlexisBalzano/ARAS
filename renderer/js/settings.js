const fs = require('fs');


document.addEventListener('DOMContentLoaded', (event) => {
    const form = document.querySelector('.dataForm');

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        console.log('Form submitted');
        // const formData = new FormData(form);
        // const data = Object.fromEntries(formData.entries());

        console.log(data);
        // Now you can use the data object
    });
});