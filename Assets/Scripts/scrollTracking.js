/* scrollTracking.js
 * Alex Morefield 2020
 * Maintains vertical position on a view and any of its children using cookies.
 * Allows for separating modals into their own views while keeping them on the
 * same UI page, without any obvious interruption when switching between them.
 */
$(document).ready(() => {

    if (typeof Cookies.get("scroll") !== "undefined")
        window.scrollTo(0, Cookies.get("scroll"));

    $(document).scroll(() => {
        Cookies.set("scroll", $(document).scrollTop(), { expires: 1 });
    });
});
