//
//    Toggle Mobile Navigation
//
const navbarMenu = document.querySelector("#navigation #navbar-menu");
const hamburgerMenu = document.querySelector("#navigation .hamburger-menu");

hamburgerMenu.addEventListener('click', function() {
    const isOpen = navbarMenu.classList.toggle("open");
    hamburgerMenu.classList.toggle("clicked", isOpen);
    hamburgerMenu.setAttribute("aria-expanded", String(isOpen));
});
