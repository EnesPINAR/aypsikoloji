document.getElementById('success_modal_close').addEventListener('click', function() {
        document.getElementById('modal_success').classList.remove('modal-open');
})

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        document.getElementById('modal_success').classList.remove('modal-open');
    }
});