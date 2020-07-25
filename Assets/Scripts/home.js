window.onload = () => {

    let queryString = window.location.search;

    if (queryString === "?sect=about") {
        document.getElementById("about").scrollIntoView();
    }

    else if (queryString === "?sect=contact")
        document.getElementById("contact").scrollIntoView();

    else if (queryString === "?sect=purchase")
        document.getElementById("purchase").scrollIntoView();



    document.getElementById("home_button").onclick = () => {

        window.scrollTo(0,0);
    }

    document.getElementById("about_button").onclick = () => {

        document.getElementById("about").scrollIntoView();
    }

    document.getElementById("contact_button").onclick = () => {

        document.getElementById("contact").scrollIntoView();
    }

    document.getElementById("purchase_button").onclick = () => {

        document.getElementById("purchase").scrollIntoView();
    }
}
