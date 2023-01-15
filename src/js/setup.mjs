import { CombatResolver } from "./CombatResolver.mjs";
import '../css/willidie.css';

export function setup(ctx) {

    // Instantiate CombatResolver
    const combatResolver = new CombatResolver();

    const safetySettings = ctx.settings.section('Safety Factor');
    const integrationSettings = ctx.settings.section('Mod integration');
    const requirementSettings = ctx.settings.section('Requirements');
    const calculationDisplaySettings = ctx.settings.section('Calculation display');
    const debugSettings = ctx.settings.section('Debug');

    ctx.onCharacterSelectionLoaded(ctx => {
        ctx.onCharacterLoaded(() => {
            const willIDieStorage = ctx.characterStorage.getItem('willidie') ?? {
                settings: {
                    safetyfactor: 2,
                    afflictionfactor: 20,
                    integrate_semi_autoslayer: false,
                    requirements: false,
                    calculations: false,
                    debug: false
                }
            };

            const safetyFactorDefault = 1 + (willIDieStorage.settings.safetyfactor / 100);
            const afflictionFactorDefault = willIDieStorage.settings.afflictionfactor;

            let integrateSemiAutoSlayerDefault = false;

            if(mod.api.SEMIAutoSlayer !== undefined) {
                integrateSemiAutoSlayerDefault = willIDieStorage.settings.integrate_semi_autoslayer;
            } else {
                integrateSemiAutoSlayerDefault = false;
            }

            const requirementsDefault = willIDieStorage.settings.requirements;
            const calculationsDefault = willIDieStorage.settings.calculations;
            const debugDefault = willIDieStorage.settings.debug;

            safetySettings.add({
                type: 'number',
                name: 'safety_factor',
                label: 'Simply put - Safety Factor adds % damage to monster max hit when survivability is calculated. This is to account for any unexpected damage sources',
                hint: '',
                min: 0,
                max: 100,
                default: willIDieStorage.settings.safetyfactor,
                onChange: (newValue) => { 
                    combatResolver.safetyFactor = 1 + (newValue / 100); 
                    combatResolver.recalculateSurvivability("Settings changed");
                    willIDieStorage.settings.safetyfactor = newValue;
                    ctx.characterStorage.setItem('willidie', willIDieStorage);
                }
            });
        
            safetySettings.add({
                type: 'number',
                name: 'affliction_factor',
                label: 'How many affliction stacks the calculator should assume you have, when enemy is able to inflict them.',
                hint: '',
                min: 0,
                max: 50,
                default: afflictionFactorDefault,
                onChange: (newValue) => { 
                    combatResolver.afflictionFactor = newValue; 
                    combatResolver.recalculateSurvivability("Settings changed"); 
                    willIDieStorage.settings.afflictionfactor = newValue;
                    ctx.characterStorage.setItem('willidie', willIDieStorage);
                }
            });

            integrationSettings.add({
                type: 'switch',
                name: 'integrate_semi_autoslayer',
                label: 'Integrate Will I Die? With SEMI Auto Slayer',
                hint: 'This makes Will I Die? to ignore monsters which you have blocked with SEMI Auto Slayer and not show them as monster tabs when targeting a slayer task tier',
                default: integrateSemiAutoSlayerDefault,
                onChange: (newValue) => { 
                    if(mod.api.SEMIAutoSlayer !== undefined) {
                        if(newValue === true) {
                            Toastify({
                                text: `Will I Die?: Successfully integrated with SEMI Auto Slayer`,
                                duration: 1500,
                                gravity: 'top',
                                position: 'center',
                                backgroundColor: '#30c78d',
                                stopOnFocus: false
                            }).showToast();

                            $(document).on('click', `#semi-auto-slayer-container .semi-grid-item`, function(e) { 
                                combatResolver.recalculateSurvivability("SEMI task settings changed"); 
                            });
                        } else {
                            Toastify({
                                text: `Will I Die?: Successfully removed integration with SEMI Auto Slayer`,
                                duration: 1500,
                                gravity: 'top',
                                position: 'center',
                                backgroundColor: '#30c78d',
                                stopOnFocus: false
                            }).showToast();

                            $(document).off('click', `#semi-auto-slayer-container .semi-grid-item`);
                        }

                        combatResolver.integrateSemiAutoSlayer = newValue; 
                        combatResolver.recalculateSurvivability("Settings changed"); 
                        willIDieStorage.settings.integrate_semi_autoslayer = newValue;
                        ctx.characterStorage.setItem('willidie', willIDieStorage);
                    } else {
                        Toastify({
                            text: `Will I Die?: SEMI Auto Slayer is not installed!`,
                            duration: 1500,
                            gravity: 'top',
                            position: 'center',
                            backgroundColor: '#e56767',
                            stopOnFocus: false
                        }).showToast();

                        return false;
                    }
                }
            });
        
            requirementSettings.add({
                type: 'switch',
                name: 'skip_requirements',
                label: 'When enabled, Will I Die? will will ignore all dungeon- and slayer-area requirements, thus allowing you to check survivability of any area',
                hint: 'This does not affect slayer task requirements (it\'s complicated)',
                default: requirementsDefault,
                onChange: (newValue) => { 
                    combatResolver.skipRequirements = newValue; 
                    combatResolver.recalculateSurvivability("Settings changed"); 
                    willIDieStorage.settings.requirements = newValue;
                    ctx.characterStorage.setItem('willidie', willIDieStorage);
                }
            });
        
            calculationDisplaySettings.add({
                type: 'switch',
                name: 'show_calculations',
                label: 'When enabled, full-ish calculation details will be displayed in the Will I Die? dropdown-menu',
                hint: 'You can hover mouse over the variables to expand on them',
                default: calculationsDefault,
                onChange: (newValue) => { 
                    combatResolver.showCalculations = newValue; 
                    combatResolver.recalculateSurvivability("Settings changed"); 
                    willIDieStorage.settings.calculations = newValue;
                    ctx.characterStorage.setItem('willidie', willIDieStorage);
                }
            });
        
            debugSettings.add({
                type: 'switch',
                name: 'debug_mode',
                label: 'Enable Debug Mode',
                hint: '',
                default: debugDefault,
                onChange: (newValue) => { 
                    combatResolver._debug = newValue; 
                    combatResolver.recalculateSurvivability("Settings changed"); 
                    willIDieStorage.settings.debug = newValue;
                    ctx.characterStorage.setItem('willidie', willIDieStorage);
                }
            });
        
            combatResolver._init(ctx);

            combatResolver.safetyFactor = safetyFactorDefault;
            combatResolver.afflictionFactor = afflictionFactorDefault;
            combatResolver.integrateSemiAutoSlayer = integrateSemiAutoSlayerDefault;

            if(integrateSemiAutoSlayerDefault) {
                $(document).on('click', `#semi-auto-slayer-container .semi-grid-item`, function(e) { 
                    combatResolver.recalculateSurvivability("SEMI task settings changed"); 
                });
            }

            combatResolver.skipRequirements = requirementsDefault;
            combatResolver.showCalculations = calculationsDefault;
            combatResolver._debug = debugDefault;

            combatResolver.recalculateSurvivability("Settings loaded");
        });
    });

    // Patch and replace CombatAreaMenu.prototype.createMenuElement method
    // This one allows us to inject our own HTML at a very specific time
    // when the game renders combat area selection grid.
    // We use this "injection window" to inject the "T" buttons
    ctx.patch(CombatAreaMenu, 'createMenuElement').replace(function (fnBody, areaData, id) {    
        const openButton = this.container.appendChild(createElement('div', {
            classList: ['col-12', 'col-md-6', 'col-xl-4']
        })).appendChild(createElement('div', {
            classList: ['block', 'block-content', 'block-rounded', 'border-top', 'border-combat', 'border-4x', 'pointer-enabled', 'clickable', ],
            id: 'clickable',
        }));

        const contentContainer = openButton.appendChild(createElement('div', {
            classList: ['media', 'd-flex', 'align-items-center', 'push']
        }));
        const image = createElement('img', {
            classList: ['shop-img'],
            attributes: [['src', areaData.media]]
        });
        const infoContainer = createElement('div', {
            classList: ['media-body']
        });
        contentContainer.append(createElement('div', {
            classList: ['mr-3'],
            children: [image]
        }), infoContainer);
        const unlockedElems = [];
        const lockedElems = [];
        const tutorialDirection = this.createTutorialDirection(areaData);
        unlockedElems.push(this.createName(areaData));
        let reqSpans = [];
        if (areaData.entryRequirements.length > 0) {
            let requirements;
            ({reqSpans, requirements} = this.createRequirements(areaData));
            unlockedElems.push(requirements);
        }
        let table;
        let buttons;
        const effectDescription = createElement('span');
        if (areaData instanceof SlayerArea) {
            unlockedElems.push(this.createEffectInfo(areaData, effectDescription));
        }
        if (areaData instanceof Dungeon) {
            if (areaData.unlockRequirement !== undefined) {
                lockedElems.push(this.createDungeonUnlock(areaData));
            }
            unlockedElems.push(...this.createDungeonInfo(areaData));
            ({table, buttons} = this.createDungeonTable(areaData));
        } else {
            ({table, buttons} = this.createMonsterTable(areaData));
        }
        infoContainer.append(...lockedElems, tutorialDirection, ...unlockedElems);
        hideElement(table);

        // --------------------------------------- OVERRIDE ---------------------------------------

        let render = true;
        const skippedAreas = ['melvorTotH:Lair_of_the_Spider_Queen', 'melvorF:Into_the_Mist', 'melvorF:Impending_Darkness']

        if(areaData instanceof Dungeon && skippedAreas.includes(areaData.id)) {
            render = false;
        }

        if (render) {
            const resolverAreaTargetButton = openButton.appendChild(createElement('div', {
                classList: ['combat-resolver-set-area-target'],
                text: "T"
            }))
    
            resolverAreaTargetButton.onclick = (e) => combatResolver.setTargetArea(
                e, 
                areaData.id, 
                areaData instanceof Dungeon ? 'dungeon' : areaData instanceof SlayerArea ? 'slayer' : ''
            );
        }

        // --------------------------------------- !OVERRIDE! -------------------------------------

        openButton.append(table);
        const eventButton = this.createEventStartButton(areaData);
        hideElement(eventButton);
        openButton.append(eventButton);
        const menuElem = {
            table: table,
            image: image,
            requirements: reqSpans,
            fightButtons: buttons, 
            isOpen: false,
            lockedElems: lockedElems,
            unlockedElems: unlockedElems,
            isEventActive: false,
            eventButton,
            openButton,
            effectDescription, 
        };
        openButton.onclick = ()=>this.toggleTable(areaData, menuElem);
        this.menuElems.set(areaData, menuElem);
    });


    ctx.patch(CombatAreaMenu, 'createMonsterTable').replace(function (fnBody, areaData) {    
        const table = createElement('table', {
            classList: ['table', 'table-sm', 'table-vcenter']
        });
        table.appendChild(createElement('thead')).appendChild(createElement('tr')).append(createElement('th', {
            classList: ['text-center'],
            attributes: [['style', 'width: 75px;']],
            children: [createElement('small', {
                text: '#'
            })],
        }), createElement('th', {
            attributes: [['style', 'width: 125px;']],
            children: [createElement('small', {
                text: getLangString('COMBAT_MISC', 'NAME')
            })],
        }), createElement('th', {
            attributes: [['style', 'width: 50px;']],
            children: [createElement('small', {
                text: getLangString('COMBAT_MISC', 'TYPE')
            })],
        }), createElement('th', {
            classList: ['text-center'],
            children: [createElement('small', {
                text: getLangString('COMBAT_MISC', 'OPTIONS')
            })],
        }));
        const body = table.appendChild(createElement('tbody'));
        const buttons = [];
        areaData.monsters.forEach((monster)=>{
            const fightButton = createElement('button', {
                classList: ['btn', 'btn-sm', 'btn-danger', 'm-1'],
                attributes: [['role', 'button']],
                text: getLangString('COMBAT_MISC', '53'),
            });
            fightButton.onclick = ()=>game.combat.selectMonster(monster, areaData);
            const dropsButton = createElement('button', {
                classList: ['btn', 'btn-sm', 'btn-primary', 'm-1'],
                attributes: [['role', 'button']],
                text: getLangString('COMBAT_MISC', '104'),
            });
            dropsButton.onclick = (event)=>{
                viewMonsterDrops(monster, false);
                event.stopPropagation();
            };

            // --------------------------------------- OVERRIDE ---------------------------------------

            const resolverMonsterTargetButton = createElement('div', {
                classList: ['combat-resolver-set-monster-target'],
                text: "T"
            })
    
            resolverMonsterTargetButton.onclick = (e) => combatResolver.setTargetMonster(
                e, 
                areaData.id,
                monster.id,
                areaData instanceof Dungeon ? 'dungeon' : areaData instanceof SlayerArea ? 'slayer' : ''
            );

            // --------------------------------------- !OVERRIDE! -------------------------------------

            body.appendChild(createElement('tr')).append(createElement('th', {
                classList: ['text-center'],
                attributes: [['scope', 'row']],
                children: [createElement('img', {
                    classList: ['max-height-64', 'max-width-64'],
                    attributes: [['src', monster.media]],
                }), ],
            }), createElement('td', {
                classList: ['font-w600', 'font-size-sm'],
                text: monster.name,
                children: [createElement('br'), createElement('small', {
                    classList: ['font-w400'],
                    text: templateString(getLangString('COMBAT_MISC', '93'), {
                        level: `${monster.combatLevel}`
                    }),
                }), createElement('br'), createElement('small', {
                    children: [createElement('img', {
                        classList: ['skill-icon-xs', 'mr-2'],
                        attributes: [['src', game.hitpoints.media]],
                    }), document.createTextNode(`${numberMultiplier * monster.levels.Hitpoints}`), ],
                }), ],
            }), createElement('td', {
                classList: ['font-w600', 'font-size-sm'],
                children: [createElement('img', {
                    classList: ['skill-icon-xxs'],
                    attributes: [['src', `${CDNDIR}assets/media/${CombatAreaMenu.attackTypeMedia[monster.attackType]}.svg`]],
                }), ],
            }), createElement('td', {
                classList: ['text-center'],
                children: [fightButton, dropsButton, resolverMonsterTargetButton],
            }));
            buttons.push(fightButton);
        }
        );
        return {
            table,
            buttons
        };
    });

    ctx.patch(SlayerTaskMenuElement, 'updateTaskSelectButtons').replace(function (fnBody, game) {
        const slayerLevel = game.slayer.level;
        SlayerTask.data.forEach((data,tier)=>{
            const button = this.selectTaskButtons[tier];
            if (button === undefined)
                return;
            button.textContent = '';
            if (slayerLevel >= data.slayerLevel) {
                let costClass;
                if (game.slayerCoins.canAfford(data.cost)) {
                    costClass = 'text-success';
                } else {
                    costClass = 'text-danger';
                }
                const combatImage = createElement('img', {
                    classList: ['skill-icon-xs', 'ml-2']
                });
                combatImage.src = cdnMedia("assets/media/skills/combat/combat.svg");
                const coinImage = createElement('img', {
                    classList: ['skill-icon-xs', 'ml-2']
                });
                coinImage.src = cdnMedia("assets/media/main/slayer_coins.svg");
                const rangeText = `${data.minLevel}${data.maxLevel === Infinity ? '+' : ` - ${data.maxLevel}`}`;
                const costText = data.cost === 0 ? getLangString('COMBAT_MISC', 'COST_FREE') : numberWithCommas(data.cost);

                // --------------------------------------- OVERRIDE ---------------------------------------

                let taskTButtonClasses = combatResolver && combatResolver.slayerTaskTierSelected !== null && tier === combatResolver.slayerTaskTierSelected ? 
                ['combat-resolver-set-slayer-task-target', 'cr-active'] : ['combat-resolver-set-slayer-task-target'];

                const resolverSlayerTaskTargetButton = createElement('div', {
                    classList: taskTButtonClasses,
                    text: "T"
                })
        
                resolverSlayerTaskTargetButton.onclick = (e) => combatResolver.setTargetSlayerTask(e, tier);

                // --------------------------------------- !OVERRIDE! -------------------------------------


                button.append(document.createTextNode(data.display), combatImage, document.createTextNode(rangeText), coinImage, createElement('span', {
                    classList: [costClass],
                    text: costText
                }), resolverSlayerTaskTargetButton);
                if (game.slayerCoins.canAfford(data.cost)) {
                    button.disabled = false;
                    button.classList.remove('disabled');
                } else {
                    button.disabled = true;
                    button.classList.add('disabled');
                }
            } else {
                const slayerImage = createElement('img', {
                    classList: ['skill-icon-xs', 'ml-2']
                });
                slayerImage.src = cdnMedia("assets/media/skills/slayer/slayer.svg");
                button.appendChild(createElement('span', {
                    classList: ['text-danger']
                })).append(...templateLangStringWithNodes('MENU_TEXT', 'REQUIRES_SKILL_LEVEL', {
                    skillImage: slayerImage
                }, {
                    level: `${data.slayerLevel}`
                }));
                button.classList.add('disabled');
                button.disabled = true;
            }
        });
    });

    

    // Patch some Player methods so we can trigger recalculation of survivability
    // This is so that we can call recalculateSurvivability() when player's stats change

    /*ctx.patch(Player, 'computeAllStats').after(() => {
        combatResolver.recalculateSurvivability();
    });*/

    ctx.patch(Player, 'updateForEquipmentChange').after(() => {
        combatResolver.recalculateSurvivability("Equipment change");
    });

    ctx.patch(Player, 'updateForEquipSetChange').after(() => {
        combatResolver.recalculateSurvivability("Equipment set change");
    });

    ctx.patch(Player, "togglePrayer").before((prayer, render) => {
        if(["melvorF:Safeguard", "melvorF:Stone_Skin", "melvorTotH:HolyAegis"].includes(prayer.id)) {
            combatResolver.recalculateSurvivability("Prayer change");
        }
        return [prayer, render];
    });

    ctx.patch(BaseManager, 'stop').after(() => {
        if(!game.combat.fightInProgress && !game.combat.isActive)
            combatResolver.recalculateSurvivability("Fled combat");
    });

    ctx.patch(PotionManager, 'usePotion').before((item, loadPotions) => {
        const existingPotion = game.potions.activePotions.get(item.action);

        if (existingPotion === undefined || existingPotion.item !== item) {
            combatResolver.recalculateSurvivability("Potion changed");
        }

        return [item, loadPotions];
    });

    ctx.patch(PotionManager, 'removePotion').after(() => {
        combatResolver.recalculateSurvivability("Potion removed");
    });

    // Hook to onInterfaceReady
    // We use this event to create our header component for this mod
    ctx.onInterfaceReady(() => {
        combatResolver._createHeaderComponent();

        $('body').on('click', '#will-i-die-header-tab-dropdown', function(e) {
            e.stopPropagation();
        });

        $('body').on('click', function(e) {
            combatResolver._fastResetTabContents();
        });
    })
}