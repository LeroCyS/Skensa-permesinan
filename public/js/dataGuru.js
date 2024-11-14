document.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    const profiles = document.querySelectorAll('.profile');
    const triggerBottom = window.innerHeight / 5 * 4;

    if (window.scrollY > 50) {
        navbar.classList.add('visible');
    } else {
        navbar.classList.remove('visible');
    }

    profiles.forEach(profile => {
        const profileTop = profile.getBoundingClientRect().top;

        if(profileTop < triggerBottom) {
            profile.classList.add('visible');
        } else {
            profile.classList.remove('visible');
        }
    });
});