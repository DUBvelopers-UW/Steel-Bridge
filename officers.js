"use strict";

import { id, gen, statusCheck, handleError, urlFor } from "./global.js";
import { createClient } from "https://esm.sh/@sanity/client";
import imageUrlBuilder from "https://esm.sh/@sanity/image-url";

(function () {
  let client;
  let builder;

  const DATASET = "production";
  const PROJECT_ID = "6t93n5tw";

  let yearToMembers = new Map();
  let yearToGroupPic = new Map();
  let latestYear = 0;
  let oldestYear = 99999999;

  /**
   * Add a function that will be called when the window is loaded.
   */
  window.addEventListener("load", init);

  /**
   * CHANGE: Describe what your init function does here.
   */
  async function init() {
    client = createClient({
      projectId: PROJECT_ID,
      dataset: DATASET,
      useCdn: false, // set to `true` to fetch from edge cache
      apiVersion: "2023-03-01", // use current date (YYYY-MM-DD) to target the latest API version
    });

    builder = imageUrlBuilder(client);
    generateMemberInfo();
  }

  async function generateMemberInfo() {
    let request =
      "https://6t93n5tw.apicdn.sanity.io/v2021-10-21/data/query/production?query=*%5B_type%3D%3D%22member%22%5D";
    let resultFetch = await fetch(request)
      .then(statusCheck)
      .then((res) => res.json())
      .catch(handleError);

    genYearToMembers(resultFetch);
    genGroupPicYear();
    genYearOptions();
  }

  async function genGroupPicYear() {
    let request =
      "https://6t93n5tw.apicdn.sanity.io/v2021-10-21/data/query/production?query=*%5B_type%3D%3D%22groupImage%22%5D";
    let resultFetch = await fetch(request)
      .then(statusCheck)
      .then((res) => res.json())
      .catch(handleError);

    for (let i = 0; i < resultFetch.result.length; i++) {
      let currentData = resultFetch.result[i];
      let year = currentData.year;
      let image = currentData.image;

      let pictureData = {
        year: year,
        image: image,
      };

      yearToGroupPic.set(year, pictureData);
    }

    changeGroupPic(latestYear);
  }

  function changeGroupPic(year) {
    let validYear = Number(year);
    while (validYear > 1980) {
      if (!yearToGroupPic.has(validYear) || !yearToMembers.has(validYear)) {
        validYear--;
      } else {
        break;
      }
    }

    if (validYear <= 1980 || validYear == null) {
      let image = yearToGroupPic.get(Number(2022)).image;
      let src = urlFor(builder, image)
        .width(1500)
        .height(1000)
        .quality(55)
        .url();
      let styleString =
        "linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(" +
        src +
        ")";
      id("title-container").style["background-image"] = styleString;
      return;
    }
    let image = yearToGroupPic.get(Number(validYear)).image;
    let src = urlFor(builder, image).width(1500).height(1000).quality(55).url();
    let styleString =
      "linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(" +
      src +
      ")";
    id("title-container").style["background-image"] = styleString;
  }

  /**
   *
   * @param {String} name - member's name
   * @param {String} role - member's role
   * @param {Object} image - member's image from sanity
   * @param {String} linkedinLink - member's linkedin
   */
  function generateMember(name, role, image, linkedinLink) {
    let div = gen("div");
    div.classList.add("member");
    div.classList.add("flex");

    let img = gen("img");
    img.classList.add("member-photo");
    img.classList.add("flex");
    img.loading = "lazy";

    if (image == null) {
      img.src = "img/hat.png";
      img.alt = "University of Washington construction hard-hat";
    } else {
      img.src = urlFor(builder, image).width(850).height(850).quality(50).url();
      img.alt = name;
    }

    div.append(img);

    let nameHeader = gen("h4");
    if (linkedinLink == null) {
      nameHeader.textContent = name;
    } else {
      let anchorTag = gen("a");
      anchorTag.textContent = name;
      anchorTag.href = linkedinLink;
      nameHeader.append(anchorTag);
    }

    div.append(nameHeader);

    let roleHeader = gen("h5");
    if (role == null) {
      roleHeader.textContent = "‎"; // this is an invisible character since the formatting breaks without it
    } else {
      roleHeader.textContent = role;
    }

    div.append(roleHeader);

    return div;
  }

  function generateMembers(year) {
    let memberArray = yearToMembers.get(year);

    // must have name, officerStatus defined
    // role, image, linkedinLink can all be undefined.

    // Wanted to be sorted by priority for members (excluding officers since they get their own array)
    // - image, role
    // - image, no role
    // - no image, role
    // - no image, NoRole

    // linkedin is irrelevant in ordering.

    let imageRole = [];
    let imageNoRole = [];
    let noImageRole = [];
    let noImageNoRole = [];

    let officersCategory = id("admin");
    let membersCategory = id("members");

    officersCategory.innerHTML = "";
    membersCategory.innerHTML = "";

    const officerOrder = {
      "general manager": 0,
      "assistant general manager": 1,
      "design manager": 2,
      "assistant design manager": 3,
      "cad technician": 4,
      "construction manager": 5,
      "assistant construction manager": 6,
      "financial manager": 7,
      "outreach manager": 8,
    };
    memberArray.sort((a, b) => {
      if (!a.role || !b.role) {
        return b.role ? 1 : -1;
      }
      const orderA =
        officerOrder[a.role.toLowerCase()] !== undefined
          ? officerOrder[a.role.toLowerCase()]
          : Infinity;
      const orderB =
        officerOrder[b.role.toLowerCase()] !== undefined
          ? officerOrder[b.role.toLowerCase()]
          : Infinity;
      return orderA - orderB;
    });

    for (let i = 0; i < memberArray.length; i++) {
      let member = memberArray[i];
      let memberDiv = generateMember(
        member.name,
        member.role,
        member.image,
        member.linkedin,
      );

      // added immediately
      if (member.officer == true) {
        officersCategory.append(memberDiv);
        continue;
      }

      // else sort through them and put them in their category.
      // you can definitely do this with only one array, but that is hard.
      if (member.image != null && member.role != null) {
        imageRole.push(memberDiv);
      } else if (member.image != null && member.role == null) {
        imageNoRole.push(memberDiv);
      } else if (member.image == null && member.role != null) {
        noImageRole.push(memberDiv);
      } else {
        noImageNoRole.push(memberDiv);
      }
      showTitles(memberArray);
    }

    imageRole.forEach(function (member) {
      membersCategory.append(member);
    });
    imageNoRole.forEach(function (member) {
      membersCategory.append(member);
    });
    noImageRole.forEach(function (member) {
      membersCategory.append(member);
    });
    noImageNoRole.forEach(function (member) {
      membersCategory.append(member);
    });

    // Hide officer/member headers if none found
  }

  function showTitles(memberArray) {
    id("admintitle").style.display = !memberArray.some(
      (e) => e.officer === true,
    )
      ? "none"
      : "block";
    if (!memberArray.some((e) => e.officer === true)) {
      id("admintitle").style.display = "none";
    } else {
      id("admintitle").style.display = "block";
    }
    if (!memberArray.some((e) => e.officer === false)) {
      id("memberstitle").style.display = "none";
    } else {
      id("memberstitle").style.display = "block";
    }
  }

  function genYearToMembers(resultFetch) {
    for (let i = 0; i < resultFetch.result.length; i++) {
      let member = resultFetch.result[i];
      let name = member.name;
      let role = member.role;
      let image = member.image;
      let linkedin = member.linkedin;
      let year = member.year;
      let officer = member.officer;

      let memberData = {
        name: name,
        role: role,
        image: image,
        linkedin: linkedin,
        officer: officer,
      };

      if (year > latestYear) latestYear = year;
      if (year < oldestYear) oldestYear = year;

      let array;
      if (yearToMembers.has(year)) {
        array = yearToMembers.get(year);
      } else {
        array = [];
      }

      array.push(memberData);
      yearToMembers.set(year, array);
    }
  }

  function genYearOptions() {
    let maxYear = -1;
    for (let i = latestYear; i >= oldestYear; i--) {
      if (yearToMembers.has(i)) {
        let currentYearOption = gen("option");
        currentYearOption.textContent = i + " - " + (i + 1);
        id("options").append(currentYearOption);
        currentYearOption.value = i;
        maxYear = Math.max(i, maxYear);
      }
    }

    id("options").addEventListener("change", function (event) {
      let options = id("options");
      let value = options.value;
      generateMembers(Number(value));
      changeGroupPic(Number(value));
      showTitles(yearToMembers.get(Number(value)));
    });

    generateMembers(latestYear);
    if (maxYear > 0) {
      showTitles(yearToMembers.get(maxYear));
    }
  }
})();
