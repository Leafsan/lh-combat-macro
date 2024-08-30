// 매크로를 실행할 때 전달된 인수에서 필요한 데이터를 가져오기
let { actor: currentActor } = args[0] ?? {};

if (!currentActor) {
  ui.notifications.error("배우를 찾을 수 없습니다.");
  return;
}

// 전투 중인지 확인
const combat = game.combat;
if (!combat) {
  ui.notifications.error("현재 전투가 진행 중이 아닙니다.");
  return;
}

// combatant 찾기
const combatant = combat.combatants.find((c) => c.actor.id === currentActor.id);
if (!combatant) {
  ui.notifications.error("해당 배우에 연결된 전투원을 찾을 수 없습니다.");
  return;
}

// 후크 ID를 저장할 변수
let hookId;

// 첫 라운드에 한 번만 이니셔티브 상승
Hooks.once("combatStart", async (combat, updateData, options, userId) => {
  await combatant.update({
    "flags.initialInitiative": combatant.initiative,
  });

  // 이니셔티브 5 상승
  await combatant.update({ initiative: combatant.initiative + 5 });
  ui.notifications.info(`${currentActor.name}의 이니셔티브가 5 상승했습니다.`);
});

// 턴이 변경될 때 원래 이니셔티브로 되돌림
hookId = Hooks.on(
  "updateCombat",
  async (combat, updateData, options, userId) => {
    if (combat.round > 1) {
      const initialInitiative =
        combatant.flags?.initialInitiative ?? combatant.initiative;
      if (combatant.initiative !== initialInitiative) {
        await combatant.update({ initiative: initialInitiative });
        ui.notifications.info(
          `${currentActor.name}의 이니셔티브가 원래 값으로 되돌아갔습니다.`
        );
      }
    }
  }
);

// 전투 종료 후 후크 삭제
Hooks.on("deleteCombat", (combat) => {
  if (hookId) {
    Hooks.off("updateCombat", hookId);
    // ui.notifications.info("전투가 종료되어 후크가 제거되었습니다.");
  }
});

// // 매크로 실행 시 알림
// ui.notifications.info(
//   "전투 첫 라운드에 이니셔티브가 5 상승하고 이후 라운드에서 원래 값으로 돌아오는 후크가 설정되었습니다."
// );
