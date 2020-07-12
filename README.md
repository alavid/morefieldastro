# Astro Photography Gallery and Print Sale Site
This is an online catalog built for [Morefield Astro Photography](https://www.instagram.com/morefield/), and is currently up and running at www.kevinmorefield.com.

If you would like to reuse this code in any way, here's some information on how it works:

### Hosting Environment:

The web server uses a PostgreSQL database and an AWS S3 cube for data storage. It relies on a .env file to connect to these services. Currently it is configured for a Heroku dyno, however it should work in any Windows or Unix-like OS, or process manager, if you populate the .env file appropriately for said environment.

### Architecture:

The application follows a loosely MVC architecture, and uses Pug as a view engine. app.js receives a user request, gets requisite data from the database, uses it to render the requested view, and sends the rendered page back to the user alongside any required files from the Assets folder. It's set up so that the image display modals are separated onto their own pages, so they can be linked to easily and directly. The uploads folder is just a temporary holding place for images uploaded to the server before sending them to S3. It is currently cleared out just by the ephemeral file system used in a Heroku Dyno. If you are running in an environment without an ephemeral file system, you may need to write a script to clear out that folder.

### Start scripts:

**"start":** Starts a development server.

**"start-production"**: Starts a production server, using either the Windows or Unix command syntax depending on your OS.

*Note: I've had inconsistent results with the package I use to detect the OS, so if you want to run a production server best to write your own external script wherever you're hosting the server, similarly to how I've written the Heroku Procfiles here.*

### Database:

You can obviously make the database however you want and just rewrite the queries, but here's how I have mine set up:

**User Table**: Contains all info about site users. A possible goal is to bring in e-Commerce and user accounts, but for now only one admin user is needed.

**Collection Table**: Contains info about collections, which are groups that the images are organized into.

**Post Table**: Contains info about the individual posts. Images are currently stored as a large version(but still downsized to prevent theft) and a thumbnail version, so each row here has two image links.

**Info Table**: Contains other fields like contact info and title copy.
