# Interview guide: testing the BEV Navigator with real people

Twenty minutes, one person, one phone. The aim is to learn where the check confuses people or leaves out what they need. It is not to find out whether they would buy an electric car.

## Who to ask

Aim for six to eight people who are not car enthusiasts: someone who rents with a shared garage or street parking, someone who commutes by car and has no home plug, someone on a tight budget, someone over 60, someone who has never thought about an electric car. Skip colleagues and friends who follow EV news; they already know the answers.

## Before you start (one minute)

Say: "I am testing the page, not you. Nothing you do can be wrong. Please say out loud what you are thinking. I will not help unless you are stuck for a full minute."

Ask them to use their own phone. Tell them nothing is stored beyond closed answers, and that they should not type a name or address. Do not record audio or screen without their yes.

## The task (ten minutes)

Give them one sentence: "Imagine a friend asked whether an electric car would work for you. Use this page to find out." Open the live site. Then stay quiet and write down:

1. Where they hesitate for more than five seconds.
2. Any word they ask about (kWh, payback, wallbox, load management).
3. Which of the six taps they pick differently from what they would say aloud.
4. Whether they find the next move without being pointed to it.
5. Whether they open My place, the charging check, the decision file or a sheet, and what they say when they do.

## Questions after the result (seven minutes)

Ask in this order, and do not suggest answers.

1. "In your own words, what did the page just tell you?"
2. "Was anything in it surprising?"
3. "Was there anything you wanted to know that it did not say?"
4. "What would you do next, if anything?" Compare with the next move shown. If they do not mention it, ask: "What does the box called Your next move say to you?"
5. "Did anything feel like it was trying to sell you something?" This is the neutrality test. Ask it plainly and note the exact words.
6. "Would you show this to someone? Who, and how?"
7. "Is there a word or a number you did not trust?"

## For the charging check and the decision file

Only if they open them. Ask: "What do you think this is for?" and "Would you print this or keep it on your phone?" Note whether three taps felt like too many.

## What to write down afterwards (five minutes)

For each person, one line each: what they decided, the first place they got stuck, the word they did not know, the thing they wanted that was missing, and anything that felt like a sales push. Do not note names. Group the notes by gap code from the INFRAS list where one fits (see `src/lib/navigator/gapcodes.ts`), because that is the same language the Zurich team uses.

## What counts as a problem

Fix before the next round: two or more people stuck in the same place; any person who thinks the page is selling; any word two people do not know (add it to the glossary in `src/lib/navigator/glossary.ts`). Note but do not fix yet: one person's taste about wording or colour.

## After the round

Send Martin the grouped list. Do not change a figure because one person disagreed with it; change a figure only when a dated public source says otherwise.
