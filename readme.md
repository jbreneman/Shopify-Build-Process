# Shopify Build Process
##### A modern(ish) build process for shopify

This is a easy to use build process featuring gulp 4, browsersync, rollup.js for js module bundling, and scss compilation using node-sass.

### Installation
- Install Shopify's [Themekit](https://shopify.github.io/themekit/) utility for uploading files to shopify automatically.
- Clone this repo to whereever you want it
- Run `npm install`
- Set up config files (see below)
- Run `theme download --env=development` to download your dev theme's files (don't do this while the watch task is running!)

### Config Files
You need to do some basic setup before everything will function correctly. This is store/project specific.

##### config.yml
This is what Themekit uses to know where to upload files to.
To start out, you'll want to create a private app in your shopify store. Click on Apps, scroll to the bottom and click on "Manage private apps", and create a new private app. Fill out the necessary info and make sure it has Read & Write access for "Theme templates and theme assets". Everything else can be set to no access. Once that's created, grab the password and replace the `PRIVATE_APP_PASSWORD` with your password.

Set `store` to your shopify store's shopify subdomain, _not_ your stores actual domain. No protocol or trailing slash.

Finally, theme id needs to be set. Generally you should work in a separate preview theme when developing. What I would recommend is going into the theme admin, duplicating the live theme, and using that as your dev theme. I'll leave it up to you to figure out how to release your changes. Theme id can be found in the url when you're customizing the theme or if you go into the code editor on shopify (it's generally a 10 character number). You can also get it by activating [ShopifyFD](http://shopifyfd.com/) on the themes page.

**A note on theme ids**: The build process will choose a profile to use based on what your git branch name is. Working in master will upload to the `production` profile (not a good idea ;). `staging` profile will be used when you're in a branch that includes the word "release". Anything else will use the `development` profile. I would recommend at the very least branching off of master to build features and then merging back in.

##### package.json
There are several things you should set here for everything to work correctly.
- `name` is what your css and javascript files will be named to (project-name.min.js/css)
- `homepage` is needed for browsersync to work correctly. Set this to your actual domain name for your store. This can either be your shopify subdomain if you don't have a custom domain set up, or your actual domain name (ie https://store-name.com/). Add the protocol and trailing slash.

Everything else is advised but not required for this to work.\

### Running the build process
Commands available:
`gulp`: For active development. Spins up a browsersync proxy to your store, compiles and uploads scss & js. Uploads any changed theme files for you while running. This is a watch task so it will run until you ctrl + c out of it.

`gulp build (--upload)`: Will minify your css & js for when you're ready to push to production. You can optionally pass in the `--upload` flag to have it upload to your current profile (see "A note on theme ids" above).

### That's pretty much it
You should be good to go! Click on the link that your console will spit out and enjoy automatic uploading and browser refresh. It's a little slow due to it being tied to your upload, but it should speed up development time overall.

### Contributing
Open an issue or submit a PR! Always open to new and better ideas.