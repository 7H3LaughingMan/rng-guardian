# RNG Guardian

[![](https://img.shields.io/badge/License-MIT-D3D3D3)](LICENSE.md)
[![](https://img.shields.io/badge/Support%20me%20on%20Ko--fi-FF5E5B?logo=ko-fi&logoColor=FFFFFF)](https://ko-fi.com/7h3laughingman)

![GitHub Downloads (specific asset, all releases)](https://img.shields.io/github/downloads/7H3LaughingMan/rng-guardian/module.zip)
![GitHub Downloads (specific asset, latest release)](https://img.shields.io/github/downloads/7H3LaughingMan/rng-guardian/latest/module.zip)
![Forge Installs](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Frng-guardian&query=package.installs&suffix=%25&label=Forge%20Installs&color=4aa94a)

Cheating in Foundry can be easy for a player if they happen to have a little bit of knowledge regarding JavaScript and the internal workings of Foundry, or if you happen to know how to use Google to find someone who posted a script to do such a thing. This module attempts to prevent users from doing such a thing along with forcing dice to use the Permuted Congruential Generator (PCG) algorithm to generate random numbers for dice instead of the built-in Mersenne Twister that Foundry uses.

## How Does This Work?

At it's core this module replaces the built-in Coin, Die, and FateDie that Foundry uses with it's own version. Unless you are using a system/module that modifies how dice works this should apply to every roll that a player makes. If a system uses custom rolls it is possible that they might use the built-in classes if they are doing some sort of custom parsing.

Each of these new classes use a newly seeded PCG algorithm to determine the results, this means that previous results don't impact new rolls and it's impossible to have a "badly" seeded algorithm being used during a player's session. The seed is saved and transmitted with the roll and on the GM's end it will automatically check each roll to confirm that the results are accurate for the saved seed. That means if a player changes the seed or result it will show a warning how the results are not correct.

## What's Wrong With Mersenne Twister?

The Mersenne Twister is a widely used PRNG algorithm that was developed in 1997 by Makoto Matsumoto and the name is derived from the choice of a Mersenne prime as its period length.
However in this day and age it is quite outdated and has it's problems. Internally it uses an array of 624 32-bit numbers as it's state, meaning it uses 19,937 bits of memory which is quite large and results in poor performance. Most 32-bit PRNGs will fail modern statistical tests meaning the results aren't always uniform but the Mersenne Twister also fails these modern statistical tests due to it's linear structure.

There is also problems with predictability, after only observing only 624 generated 32-bit numbers it's possible to reverse the internal state pretty easily and you can predicate all future results. When it comes to Foundry it's even easier and you can just use your browser's debugging tools to extract the internal state, and since only one instance is used for your entire session all your rolls untill you refresh the page are pre-determined.

## What's The Deal With PCG

Permuted Congruential Generator (PCG) is a family of PRNG algorithms that was developed in 2014 by Dr. M.E. O'Neill. It's easy to use, flexible, faster, and uses less memory. At the same time it's performance when it comes to statistical tests is excellent and the results produced are less predictable.

And like I mentioned when it comes to Foundry each group of die uses it's own seeded PCG algorithm meaning none of your rolls are pre-determined.

## Potential Problems

This module was designed based on core Foundry functionality, meaning that it's possible it might not work in certain cases based on which system you are using and which modules you have installed. I have done extensive testing for both DnD 5e and PF2e and it works as intended, if you are using a different system it is possible they might be doing something funky and you will get warnings about rolls not being right or not using the new classes.

If you are using modules that mess with the results then it's possible those module will either be broken and not work properly or will continue to work properly and will result in warnings since results are being fudged.