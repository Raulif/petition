# Petition



### Contents

* [Overview](#overview)
* [Tech stack](#tech-stack)
* [Description](#description)




## Overview

**Petition** is a **full stack, single page application** that allows the users to support a petition by stamping their signature in it. I developed it during my participation on SPICED Academy (Berlin), a 12-week coding bootcamp focused on full stack JavaScript web development.

The goal of the project was to learn how to use ExpressJS together with HandlebarsJS templating engine and jQuery.

I chose it to be a petition to request that the artist Jonah Smith comes to tour in Europe.

**Time frame:** 1 week



## Tech stack:

- **Frontend**: jQuery, HandlebarsJS templating engine.
- **Backend**: ExpressJS.
- **Databases**: PostgreSQL.




## Description

The landing page welcome the user with a **registry form**, where the user can enter his/her information. Clicking on submit will send the data to the data base. The **password is hashed and salted** before it is saved on the data base.

If the user has already registered in the past, he/she can also use the **login form**.

![register](/Users/rauliglesias/Documents/Dev/petition/public/images/register.gif)



After registration, the user can optionally enter further details about him/herself to complete his/her **user-profile**, or can also skip the step.

![enter-profile](/Users/rauliglesias/Documents/Dev/petition/public/images/enter-profile.gif)



Now comes the crucial part of the process, which is allowing the user to **stamp the signature**. This is done through a **canvas element** that captures the mouse movement drawing a line.

![enter-signature](/Users/rauliglesias/Documents/Dev/petition/public/images/enter-signature.gif)



The signature is turned into a URL, which is in turn stored in the data base, together with the rest of the user's profile information. After the user has signed the petition, he/she is allowed into the main page of the application. 

The first option offered to the user is seeing the **full list of users** who have already signed the petition. Each user is displayed with the full name, age and city (if they entered it).

The user can click on one of the cities and all users from that particular city will be displayed. The user can navigate back to the main page at any time through the "*go back*".

![users-cities](/Users/rauliglesias/Documents/Dev/petition/public/images/users-cities.gif)



Additionally the user can **edit the profile information** previously entered, including the password.

![edit-profile](/Users/rauliglesias/Documents/Dev/petition/public/images/edit-profile.gif)



At all times, the user can **toggle the Spotify player** (*i-frame*) by clicking on the player button and listen to Jonah Smith music, this helps the user discover the reason behind the petition, in case he/she has never heard of Jonah Smith.

![player](/Users/rauliglesias/Documents/Dev/petition/public/images/player.gif)



As the last option, the user can delete his/her signature from the data base. The app will request the user to sign again. If the user is not interested, he/she can *Log Out* and leave the application. The *Log Out* option is available at all times.

![delete-signature](/Users/rauliglesias/Documents/Dev/petition/public/images/delete-signature.gif)



# Contact

- Email: raul4cade@gmail.com.
- Twitter: @raulif.
- LinkedIn: Raul Iglesias

