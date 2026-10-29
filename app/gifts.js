/* v0.23.188 Five Gifts self-reflection (character structure traditions: Reich, Lowen, Pierrakos). Shared by assessment.html + assessment-results.html */
(function(){
const SCALE=["Not true","Rarely","Sometimes","Often","Very true"];
const INTRO="Rate how true each statement is for you, especially under stress or in close relationships.";
/* [id, gift, text]  e=Existence n=Need t=Trust a=Autonomy l=Love. Items 16-25 are additions (5 per gift). Order fixed. */
const Q=[
["g1","e","I feel more at home in my head than in my body."],
["g2","n","I worry that people I care about will leave."],
["g3","t","I need to be in control to feel safe."],
["g4","a","I hold my feelings in rather than express them."],
["g5","l","I feel I have to earn love through achievement."],
["g6","e","I sometimes feel numb or “not fully here.”"],
["g7","n","I find it hard to ask directly for what I need."],
["g8","t","It’s hard for me to rely on others or let someone else lead."],
["g9","a","I say yes when I mean no, and then feel resentful."],
["g10","l","I keep my heart guarded, even with people I care about."],
["g11","e","When someone gets very close, I want to pull back."],
["g12","n","I often feel drained, as if there is never quite enough."],
["g13","t","I dislike showing weakness or vulnerability."],
["g14","a","I carry a lot and endure without complaining."],
["g15","l","It’s hard for me to receive care or compliments without giving something back."],
["g16","e","I often feel I don’t quite belong, or that I take up too much space."],
["g17","n","I give a lot to others, quietly hoping to be cared for in return."],
["g18","t","I read people carefully to work out whether I can trust them."],
["g19","a","I feel stuck or heavy, and put off decisions until I feel pressured."],
["g20","l","I find it hard to fully relax; I feel I should always be doing something well."],
["g21","e","I need a lot of time alone to recover after being with people."],
["g22","n","When support falls away, I tend to collapse or give up quickly."],
["g23","t","It’s hard for me to admit I was wrong or to lose."],
["g24","a","I feel shame, or freeze, when someone pushes me or watches me closely."],
["g25","l","I worry that if I fully open my heart, I will be rejected."]];
const NEW=new Set(["g16","g17","g18","g19","g20","g21","g22","g23","g24","g25"]);
const G={
e:{k:"e",name:"Existence",right:"The right to exist",trad:"Schizoid",legacy:"schizoid",icon:"✧",
 core:"Do I feel I have the right to be here, to take up space, to be in my body?",
 gifts:"Depth, sensitivity, intuition, independence, creativity and clarity. You perceive what others miss and have a rich inner world.",
 safe:"When the world felt too intense or unsafe, you learned to withdraw inward: into your mind, into needing little, into staying out of reach.",
 stress:"Feeling numb or “not really here”, isolating, living in your head, pulling away when someone gets close.",
 body:"Tension in the neck, shoulders and joints, cold hands and feet, a floaty or disconnected feeling, watchful eyes.",
 supports:"Feeling safe enough to be here, in your body and in contact. Grounding, small doses of connection, predictable routines, and being met gently and without pressure.",
 breath:[["Pace","Slow and gentle, in short rounds."],["Intensity","Low. Strong charge can lead to dissociation."],["Focus","Grounding, feet, orienting to the room, eyes open if needed, and contact with the facilitator."],["Success looks like","More presence, not a big release."]],
 daily:"Feet on the floor: press your feet down for 5 slow breaths, eyes open, and name three things you can see in the room.",
 prac:"Go slow, keep eyes-open orienting available and check presence often. Short rounds, low charge."},
n:{k:"n",name:"Need",right:"The right to our needs",trad:"Oral",legacy:"oral",icon:"◌",
 core:"Do I feel my needs are allowed, and that they can be met?",
 gifts:"Warmth, openness, generosity, empathy and receptivity. You open hearts easily and know how to connect.",
 safe:"When support wasn’t reliably there, you learned to reach out, stay close and sense what others need, so connection wouldn’t disappear.",
 stress:"Clinging, feeling empty or depleted, collapsing, fear of being alone, giving up quickly, finding it hard to ask for things directly.",
 body:"A softer or collapsed chest, tired or weak legs, low energy, difficulty holding charge.",
 supports:"Knowing your needs are valid, learning to ask directly, nourishing yourself, and discovering that you can stand on your own legs while staying connected.",
 breath:[["Pace","Build gradually, with rest pauses."],["Intensity","Moderate. Energy can run out quickly."],["Focus","Legs and grounding, containing and holding energy, receiving support, and nourishing yourself afterwards."],["Success looks like","Feeling supported from within, not only by the facilitator."]],
 daily:"Stand with soft knees, hands on your belly, and breathe into your legs for 1 minute. Then ask for one small thing you need today, out loud.",
 prac:"Build charge gradually with rests; support standing and legs; plan a nourishing close and invite direct requests."},
t:{k:"t",name:"Trust",right:"The right to trust",trad:"Psychopathic / Challenger",legacy:"psychopathic",icon:"△",
 core:"Can I trust and be supported without losing my power or control?",
 gifts:"Strength, courage, leadership, charisma and protectiveness. You take responsibility and stand up for others.",
 safe:"When trust was broken or vulnerability was used against you, you learned to stay in control, read people carefully and not depend on anyone.",
 stress:"Controlling situations, mistrust, pushing or dominating, hiding vulnerability, and finding it hard to let go or be supported.",
 body:"A strong, charged upper body, a guarded presence, an intense gaze, and a pelvis or lower body that feels less alive.",
 supports:"Letting trust grow in small steps, allowing softness, and discovering that you can be supported without losing your power.",
 breath:[["Pace","Steady and clear, with room for pauses."],["Intensity","Can be strong, but surrender is the edge, so invite softening rather than pushing harder."],["Focus","Belly and pelvis, the long exhale, letting go, and the vulnerability beneath strength."],["Success looks like","Allowing yourself to be held and supported. Clear agreements and choice at every step help."]],
 daily:"Lie down with a hand on your belly and let 6 long exhales go a little longer than the inhale. Let the floor hold you.",
 prac:"Make clear agreements and offer choice at every step. Invite softening rather than more effort; work belly, pelvis and the long exhale."},
a:{k:"a",name:"Autonomy",right:"The right to autonomy",trad:"Masochistic / Endurer",legacy:"masochistic",icon:"▢",
 core:"Can I say yes and no freely, and express myself without shame or pressure?",
 gifts:"Loyalty, patience, endurance, warmth and groundedness. You are dependable and can carry a lot.",
 safe:"When your will or self-expression was pressured or shamed, you learned to hold it in, comply and endure, and to avoid open conflict.",
 stress:"Quiet resentment, passive resistance, feeling stuck, difficulty saying no, self-sabotage, and shame when seen or pushed.",
 body:"A compressed or heavy feeling, a thick neck, a tight jaw, pressure held inward, and strength that stays held back.",
 supports:"Claiming your “yes” and your “no”, expressing what you feel, taking up space, and moving freely without having to perform.",
 breath:[["Pace","Your own, with no pressure to “release”."],["Intensity","Moderate, with space for sound, voice and movement."],["Focus","Jaw, throat and pelvis, saying “no” out loud, pushing and kicking, and rest afterwards."],["Success looks like","Spontaneous expression that you choose, not one that is demanded of you."]],
 daily:"Let your jaw hang loose and sigh out loud 5 times. Then say one clear “no” (or “yes”) today that you really mean.",
 prac:"Let the client set the pace, with no pressure to release. Invite voice, sound, pushing and a clear “no”; rest afterwards."},
l:{k:"l",name:"Love",right:"The right to love and sexuality",trad:"Rigid / Achiever",legacy:"rigid",icon:"♡",
 core:"Can I open my heart and receive love and pleasure without having to earn it?",
 gifts:"Integrity, drive, reliability, grace and dedication. You bring passion and commitment to what matters.",
 safe:"When love felt tied to performance, or an open heart met rejection or shame, you learned to protect the heart through effort, control and doing things well.",
 stress:"Perfectionism, anxiety, fear of failure, a guarded heart, performing even in intimacy, and difficulty receiving.",
 body:"An upright, firm posture, an armoured chest and upper back, a restrained breath, and tension between the shoulder blades.",
 supports:"Softening the effort, receiving without earning, and allowing tenderness and pleasure to be part of who you are.",
 breath:[["Pace","Soft and flowing, with no “correct” way to breathe."],["Intensity","Gentle to moderate."],["Focus","Opening the chest and heart, tears and tenderness, melting rather than achieving, and integration with supportive touch."],["Success looks like","Letting go of effort. Approach sexuality themes with extra care, consent and no pushing."]],
 daily:"Place a warm hand on your heart, breathe softly for 1 minute, and receive one kind word today without giving anything back.",
 prac:"Keep it soft and flowing; there is no right way to breathe. Melt rather than achieve. Approach sexuality themes with extra care and consent."}};
const ORDER=["e","n","t","a","l"];
const DISC="This is an educational self-reflection tool, not a diagnosis. It is based on character structure traditions (Reich, Lowen, Pierrakos) and has not been scientifically validated as a personality test. It does not replace psychotherapy or medical care. Breathwork is not suitable for everyone. Please consult a doctor first if you are pregnant or have a heart condition, epilepsy, serious psychiatric history, or other medical concerns.";
const band=p=>p>=75?"Strong pattern":p>=40?"Present":"Less active";
/* answers {g1:0-4,...} -> scores. Max per gift = 4 × items. Blend if top two are within 10% (≈ 1-2 points on the original 12-point scale). */
function score(ans,src){const sc={},mx={};ORDER.forEach(k=>{sc[k]=0;mx[k]=0});Q.forEach(([id,g])=>{if(ans[id]!=null){sc[g]+=+ans[id];mx[g]+=4}});
 const pct={};ORDER.forEach(k=>pct[k]=mx[k]?Math.round(sc[k]/mx[k]*100):0);return finish(pct,sc,src||"questionnaire",Object.keys(ans).length)}
function finish(pct,sc,src,n){const rk=ORDER.slice().sort((a,b)=>pct[b]-pct[a]),blend=pct[rk[0]]-pct[rk[1]]<=10;
 return {v:1,source:src,answered:n,scores:sc,pct,bands:Object.fromEntries(ORDER.map(k=>[k,band(pct[k])])),primary:rk[0],secondary:rk[1],blend,rank:rk}}
/* legacy: older scans stored pattern_scores (5 items × 0-3 = 0-15 per structure) */
function fromLegacy(ps){if(!ps)return null;const pct={},sc={};ORDER.forEach(k=>{const v=+ps[G[k].legacy]||0;sc[k]=v;pct[k]=Math.round(v/15*100)});return finish(pct,sc,"earlier patterns questionnaire",25)}
window.FA_GIFTS={Q,NEW,G,ORDER,SCALE,INTRO,DISC,band,score,fromLegacy};
})();
