# Astro Photography Gallery and Print Sale Web Application
This is an online catalog and print sale site built for [Morefield Astro Photography](https://www.instagram.com/morefield/), and is currently up and running at www.kevinmorefield.com.
The web server uses a PostgreSQL database and an AWS S3 cube for data storage. It relies on a .env file to connect to these services. Currently it is configured for a Heroku dyno, however it should work in any Windows or Unix-like OS, or process manager, if you populate the .env file appropriately for said environment.
Start scripts:
# start
Starts a development server.
# start-production
Starts a production server, using either the Windows or Unix command syntax depending on your OS.
*Note: I've had inconsistent results with the package I use to detect the OS, so if you want to run a production server best to write your own external script wherever you're hosting the server, similarly to how I've written the Heroku Procfiles here.
