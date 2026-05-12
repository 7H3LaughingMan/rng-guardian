import { PcgRandom } from "../pkg/rng_guardian.js";
import * as R from "remeda";
import {
    DatabaseCreateOperation,
    DatabaseUpdateOperation
} from "@7h3laughingman/foundry-types/common/abstract/_types.mjs";
import { EvaluateRollParams, RollJSON } from "@7h3laughingman/foundry-types/client/dice/roll.mjs";
import { RollTermData } from "@7h3laughingman/foundry-types/client/dice/terms/_types.mjs";
import module from "../module.json" with { type: "json" };

type GConstructor<T = {}> = { new (...args: any[]): T; SERIALIZE_ATTRIBUTES: string[] };

function PcgMixin<TBase extends GConstructor<foundry.dice.terms.DiceTerm>>(Base: TBase) {
    const SERIALIZE_ATTRIBUTES = [...Base.SERIALIZE_ATTRIBUTES, "state"];

    return class extends Base {
        constructor(...args: any[]) {
            super(...args);
            this.#state = (this.#pcg = new PcgRandom(args[0].state)).state();
        }

        get state() {
            return this.#state;
        }

        #state: string;
        #pcg: PcgRandom;

        static override SERIALIZE_ATTRIBUTES = SERIALIZE_ATTRIBUTES;

        async _roll() {
            return this.randomFace();
        }

        randomFace() {
            // @ts-expect-error
            return this.mapRandomFace(this.#pcg.random());
        }
    };
}

class PcgCoin extends PcgMixin(foundry.dice.terms.Coin) {}
class PcgDie extends PcgMixin(foundry.dice.terms.Die) {}
class PcgFateDie extends PcgMixin(foundry.dice.terms.FateDie) {}

class RollConfig extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = {
        id: "roll-config",
        tag: "form",
        window: {
            contentClasses: ["standard-form"],
            title: "Ignored Rolls",
            icon: "fa-solid fa-dice"
        },
        position: {
            width: 400
        },
        form: {
            closeOnSubmit: true
        },
        actions: {
            add: this.prototype._onAddRoll,
            delete: this.prototype._onDeleteRoll
        }
    };

    static override PARTS = {
        form: {
            template: `modules/${module.id}/templates/menus/roll-config.hbs`,
            scrollable: [""]
        },
        footer: {
            template: "templates/generic/form-footer.hbs"
        }
    };

    protected override async _prepareContext(
        options: foundry.applications.ApplicationRenderOptions
    ): Promise<foundry.applications.ApplicationRenderContext> {
        const definitions = game.settings.get(module.id, "ignoredRolls", {}) as string[];

        const ignoredRolls = definitions.map((value, index) => {
            return { value, index };
        });

        const availableChoices = CONFIG.Dice.rolls
            .filter((roll) => !definitions.includes(roll.name))
            .map((roll) => {
                return { value: roll.name };
            });

        return {
            // @ts-expect-error
            ignoredRolls: ignoredRolls,
            availableChoices: availableChoices,
            buttons: [{ type: "button", label: "Add Roll", icon: "fa-solid fa-plus", action: "add" }]
        };
    }

    protected async _onAddRoll(event: PointerEvent) {
        event.preventDefault();

        const fd = new foundry.applications.ux.FormDataExtended(this.parts.form as HTMLFormElement);
        const roll = fd.get("roll") || "";

        if (!roll) {
            ui.notifications.warn("");
            return;
        }

        const definitions = game.settings.get(module.id, "ignoredRolls", {}) as string[];
        await game.settings.set(module.id, "ignoredRolls", [...definitions, roll]);
        this.render(true);
    }

    protected async _onDeleteRoll(event: PointerEvent, target: HTMLElement) {
        event.preventDefault();

        const btn = target.closest<HTMLElement>("[data-roll]");
        if (!btn) return;
        const { index } = btn.dataset;
        if (!index) return;

        const definitions = game.settings.get(module.id, "ignoredRolls", {}) as string[];
        definitions.splice(Number(index), 1);
        await game.settings.set(module.id, "ignoredRolls", definitions);
        this.render(true);
    }
}

async function checkRoll({ userId, roll }: { userId: string; roll: RollJSON }) {
    const ignoredRolls = game.settings.get(module.id, "ignoredRolls", {}) as string[];
    if (ignoredRolls.includes(roll.class)) return;

    let user = game.users.get(userId)!;
    let originalRoll = Roll.fromData(roll);

    for (const die of originalRoll.dice) {
        if (die instanceof PcgCoin || die instanceof PcgDie || die instanceof PcgFateDie) {
            let clonedTerm = foundry.dice.terms.DiceTerm.fromData(
                foundry.utils.mergeObject(foundry.utils.deepClone(die.toJSON()), { evaluated: false, results: [] })
            );

            await clonedTerm.evaluate(originalRoll.options.evaluate as EvaluateRollParams | undefined);

            if (
                !R.isDeepEqual(
                    die.results.map((value) => value.result),
                    clonedTerm.results.map((value) => value.result)
                )
            ) {
                ui.notifications.warn(
                    `${user.name} tried to roll "${die.formula}" and was supposed to get [${clonedTerm.results.map((r) => r.result).join(", ")}], but instead got [${die.results.map((r) => r.result).join(", ")}].`,
                    { permanent: true }
                );
            }
        } else {
            ui.notifications.warn(
                `${user.name} tried to roll a ${originalRoll.constructor.name} but it contains ${die.constructor.name} which is not a PCG die.`,
                { permanent: true }
            );
        }
    }
}

Hooks.once("init", () => {
    CONFIG.Dice.terms["c"] = PcgCoin;
    // @ts-expect-error
    CONFIG.Dice.terms["d"] = PcgDie;
    CONFIG.Dice.terms["f"] = PcgFateDie;

    CONFIG.queries[`${module.id}.checkRoll`] = checkRoll;

    libWrapper.register<Roll, Roll["evaluate"]>(
        module.id,
        "Roll.prototype.evaluate",
        async function (this: Roll, wrapped: Roll["evaluate"], options?: EvaluateRollParams) {
            this.options.evaluate = options;
            await wrapped(options);

            if (!game.user.isActiveGM) {
                game.users.activeGM?.query(`${module.id}.checkRoll`, {
                    userId: game.userId,
                    roll: this.toJSON()
                });
            }

            return this as foundry.dice.Rolled<Roll>;
        },
        "WRAPPER"
    );

    if (game.system.id === "pf2e" || game.system.id === "sf2e") {
        let damageRoll = CONFIG.Dice.rolls.findIndex((roll) => roll.name === "DamageRoll");

        if (damageRoll !== -1) {
            libWrapper.register(
                module.id,
                `CONFIG.Dice.rolls["${damageRoll}"].classifyDice`,
                function (data: RollTermData) {
                    // Find all dice terms and resolve their class
                    type PreProcessedDiceTerm = { class: string; faces?: string | number | object };
                    const isDiceTerm = (v: unknown): v is PreProcessedDiceTerm =>
                        R.isPlainObject(v) && v.class === "DiceTerm";
                    const deepFindDice = (value: object): PreProcessedDiceTerm[] => {
                        const accumulated: PreProcessedDiceTerm[] = [];
                        if (isDiceTerm(value)) {
                            accumulated.push(value);
                        } else if (R.isObjectType(value)) {
                            const objects = Object.values(value).filter((v): v is object => R.isObjectType(v));
                            accumulated.push(...objects.flatMap((o) => deepFindDice(o)));
                        }

                        return accumulated;
                    };
                    const diceTerms = deepFindDice(data);

                    for (const term of diceTerms) {
                        if (typeof term.faces === "number" || R.isPlainObject(term.faces)) {
                            term.class = "PcgDie";
                        } else if (typeof term.faces === "string") {
                            const termClassName = CONFIG.Dice.terms[term.faces]?.name;
                            if (!termClassName)
                                throw Error(`PF2e System | No matching DiceTerm class for "${term.faces}"`);
                            term.class = termClassName;
                        }
                    }
                },
                "OVERRIDE"
            );
        }
    }
});

Hooks.once("setup", () => {
    game.settings.register(module.id, "ignoredRolls", {
        name: "Ignored Rolls",
        scope: "world",
        config: false,
        type: new foundry.data.fields.ArrayField(new foundry.data.fields.StringField()),
        default: []
    });

    game.settings.registerMenu(module.id, "configureIgnoredRolls", {
        name: "Configure Ignored Rolls",
        label: "Ignored Rolls",
        hint: `This is a list of Rolls that will be ignored by ${module.title}.`,
        icon: "fa-solid fa-dice",
        type: RollConfig,
        restricted: true
    });
});

Hooks.once("ready", () => {
    CONFIG.Dice.rolls.forEach((roll) => Object.freeze(roll.prototype));
    Object.values(CONFIG.Dice.termTypes).forEach((termType) => Object.freeze(termType.prototype));
    Object.values(CONFIG.Dice.terms).forEach((term) => Object.freeze(term.prototype));
    CONFIG.Dice.types.forEach((type) => Object.freeze(type.prototype));
});

Hooks.on(
    "createChatMessage",
    // @ts-expect-error
    (document: ChatMessage, _options: DatabaseCreateOperation<ChatMessage>, userId: string) => {
        if (!game.user.isActiveGM) return;
        if (userId === game.userId) return;

        for (const roll of document.rolls) {
            checkRoll({ userId, roll: roll.toJSON() });
        }
    }
);

Hooks.on(
    "updateChatMessage",
    // @ts-expect-error
    (document: ChatMessage, _changed: object, _options: DatabaseUpdateOperation<ChatMessage>, userId: string) => {
        if (!game.user.isActiveGM) return;
        if (userId === game.userId) return;

        for (const roll of document.rolls) {
            checkRoll({ userId, roll: roll.toJSON() });
        }
    }
);
